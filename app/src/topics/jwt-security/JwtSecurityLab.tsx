import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '09-jwt-security'

type Scenario = 'payload' | 'storage' | 'alg' | 'ttl' | 'logout'

export function JwtSecurityLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('payload')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()

    if (scenario === 'payload') {
      log('info', 'JWT = header.payload.signature')
      log('warn', 'payload (base64): {"sub":"42","role":"admin","exp":…}')
      log('err', 'секреты в payload видны без ключа — это не шифрование')
      log('ok', 'decode ≠ verify: без проверки подписи токену нельзя доверять')
      setHint('в JWT не класть пароли/секреты; всегда jwt.verify')
      return
    }

    if (scenario === 'storage') {
      log('info', 'SPA сохранила access в localStorage')
      log('err', 'XSS: скрипт читает localStorage.access_token')
      log('err', 'атакующий шлёт Bearer от имени пользователя')
      log('ok', 'access → memory (короткий TTL); refresh → httpOnly Secure SameSite cookie')
      setHint('XSS + localStorage = кража сессии')
      return
    }

    if (scenario === 'alg') {
      log('info', 'сервер ждал RS256 (публичный ключ)')
      log('err', 'токен с alg: none или подмена на HS256 + публичный ключ как секрет')
      log('err', 'verify без whitelist algorithms → algorithm confusion')
      log('ok', 'jwt.verify(token, key, { algorithms: ["RS256"] })')
      setHint('явный algorithms — обязателен')
      return
    }

    if (scenario === 'ttl') {
      log('info', 'access TTL = 15m, refresh = 7d + rotation')
      log('ok', 'украденный access быстро протухает')
      log('ok', 'refresh в httpOnly cookie, ротация при обновлении')
      log('warn', 'access TTL = 30d без отзыва → долгий ущерб после утечки')
      setHint('короткий access + защищённый refresh')
      return
    }

    log('info', 'пользователь нажал Logout')
    log('warn', 'stateless JWT сам по себе не отозван до exp')
    log('ok', 'варианты: blacklist jti / версия токена в БД / очень короткий TTL')
    log('ok', 'очистить refresh cookie + ротация семейства refresh')
    setHint('logout = инфраструктура отзыва, не только удалить из memory')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        JWT удобен для API, но payload читается кем угодно, а без <code>verify</code>, короткого TTL и
        аккуратного хранения токен легко украсть или подделать.
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: payload, storage, alg, TTL, logout.</li>
        <li>Прогоните и разберите риски в логе.</li>
        <li>
          В «Код»: <code>auth.js</code>, <code>apiClient.ts</code>, <code>session.ts</code>.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['payload', 'Payload'],
            ['storage', 'Storage'],
            ['alg', 'Algorithms'],
            ['ttl', 'TTL'],
            ['logout', 'Logout'],
          ] as const
        ).map(([id, label]) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={scenario === id}
            onClick={() => setScenario(id)}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Прогнать
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setScenario('payload')
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите сценарий.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`verify` + `algorithms`, короткий access, refresh в httpOnly cookie."
      snippets={[
        {
          id: 'auth',
          label: 'auth.js',
          note: 'Подпись, exp/iss/aud и явный список algorithms.',
          executable: false,
          code: `import jwt from 'jsonwebtoken';
import fs from 'node:fs';

const publicKey = fs.readFileSync('./keys/public.pem');
const privateKey = fs.readFileSync('./keys/private.pem');

// ═══════════════════════════════════════════
// ISSUE ← короткий access; секреты в payload нельзя
// ═══════════════════════════════════════════
export function issueAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role }, // ← не password / не card
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '15m', // ← короткий TTL
      issuer: 'https://api.example',
      audience: 'https://app.example',
    },
  );
}

// ═══════════════════════════════════════════
// VERIFY ← decode без verify недостаточно
// ═══════════════════════════════════════════
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, publicKey, {
      algorithms: ['RS256'], // ← защита от alg confusion / none
      issuer: 'https://api.example',
      audience: 'https://app.example',
    });
    next();
  } catch {
    return res.sendStatus(401);
  }
}`,
        },
        {
          id: 'client',
          label: 'apiClient.ts',
          note: 'Access в памяти; не localStorage при XSS-риске.',
          executable: false,
          code: `let accessToken: string | null = null; // ← memory, не localStorage

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', \`Bearer \${accessToken}\`); // ← не в URL / query
  }

  const res = await fetch(\`https://api.example\${path}\`, {
    ...init,
    headers,
    credentials: 'include', // ← refresh cookie (httpOnly) на тот же API
  });

  if (res.status === 401) {
    const ok = await refreshSession();
    if (!ok) throw new Error('unauthorized');
    headers.set('Authorization', \`Bearer \${accessToken}\`);
    return fetch(\`https://api.example\${path}\`, { ...init, headers, credentials: 'include' });
  }

  return res;
}

async function refreshSession() {
  const res = await fetch('https://api.example/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    accessToken = null;
    return false;
  }
  const data = (await res.json()) as { accessToken: string };
  accessToken = data.accessToken;
  return true;
}`,
        },
        {
          id: 'session',
          label: 'session.js',
          note: 'Refresh cookie + заготовка отзыва (jti blacklist).',
          executable: false,
          code: `import { issueAccess } from './auth.js';

const revoked = new Set(); // ← prod: Redis / БД по jti

// ═══════════════════════════════════════════
// REFRESH ← httpOnly Secure SameSite; не читать из JS
// ═══════════════════════════════════════════
export function setRefreshCookie(res, refreshJwt) {
  res.cookie('refresh', refreshJwt, {
    httpOnly: true, // ←
    secure: true, // ← только HTTPS
    sameSite: 'lax', // ← CSRF-осознанно; для cross-site — стратегия + CSRF token
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function logout(req, res) {
  const jti = req.refresh?.jti;
  if (jti) revoked.add(jti); // ← отзыв до exp
  res.clearCookie('refresh', { path: '/auth' });
  res.sendStatus(204);
}

export function isRevoked(jti) {
  return revoked.has(jti);
}

export function rotateAccess(user) {
  return issueAccess(user);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Безопасность JWT"
      lead="Payload, хранение, algorithms, TTL и отзыв при logout."
      problem={problem}
      code={code}
    />
  )
}
