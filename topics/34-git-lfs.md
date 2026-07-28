# 1. Тема

**Git LFS (Large File Storage)**

---

# 2. Главное в одну фразу

Git LFS хранит большие бинарники на отдельном LFS-хранилище, а в Git оставляет лёгкие указатели — чтобы clone/fetch не раздувались огромными версиями файлов.

---

# 3. Ответ для собеседования

> «**Git LFS** — расширение для больших файлов (psd, mp4, zip, модели).
> В коммите лежит **pointer**, сам blob — на LFS-сервере. Типы файлов задают через `git lfs track` → `.gitattributes`.
>
> Типичный поток: `git lfs install` → `lfs track "*.mp4"` → add/commit/push. На clone/pull LFS скачивает нужные объекты (иногда отдельно `git lfs pull`).
> Плюсы: меньше размер «обычного» Git-репозитория, быстрее операции с историей. Минусы: нужна поддержка LFS на hosting, квоты, не все CI из коробки.»

---

# 4. Самое главное запомнить

- В Git — pointer, файл — на LFS.
- `lfs track` пишет `.gitattributes`.
- Нужен `git lfs install` у разработчика.
- Для бинарников с частыми версиями, не для всего подряд.

```bash
git lfs install
git lfs track "*.psd"
git lfs ls-files
```

---

# 5. Описание

```bash
git lfs track "*.mp4"
git add .gitattributes video.mp4
git commit -m "Add large video"
git push origin main
```

В `.gitattributes`:

```text
*.zip filter=lfs diff=lfs merge=lfs -text
```

---

# 6. Ссылки

- [Git LFS](https://git-lfs.github.com/)
- [GitHub — About Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)
