# Terang Pijar Prototype

Prototipe web 4 tab (Profil, Duel, Jalur, Simulator). Responsif: HP (navigasi bawah) dan laptop (sidebar kiri). **Data simulasi.**

## Struktur
```
index.html
css/style.css
js/app.js
.nojekyll
```

## Upload ke GitHub + aktifkan GitHub Pages
1. Buat repo baru di GitHub (mis. `terang-pijar-prototype`), tipe Public.
2. Klik **Add file → Upload files**, seret semua isi folder ini (termasuk folder `css` dan `js`), lalu **Commit changes**.
3. Buka **Settings → Pages**. Pada *Build and deployment* pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit. Alamatnya: `https://USERNAME.github.io/terang-pijar-prototype/`

## Pencatatan interaksi (opsional)
Di GitHub Pages tidak ada `google.script.run`, jadi log mati secara default. Untuk mencatat ke Google Sheet, tambahkan `doPost(e)` di Apps Script yang memanggil `logEvent(JSON.parse(e.postData.contents))`, deploy sebagai Web app (akses *Anyone*), lalu tempel URL `/exec` ke konstanta `LOG_URL` di `js/app.js`.

## Uji model
Fungsi model ada di antara `// MODEL_START` dan `// MODEL_END` di `js/app.js`.
