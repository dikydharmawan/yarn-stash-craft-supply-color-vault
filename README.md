# Koleksi Benang

Aplikasi satu halaman untuk mengatalogkan benang & perlengkapan tekstil kerajinan lokal di browser (localStorage, tanpa backend).

## Fitur
- Entri: nama, warna+kode, berat/jenis, jumlah+satuan, panjang, harga, merek, catatan
- Tombol cepat **+/−** untuk stok, dan **Salin** untuk menduplikat entri
- Ringkasan per jenis & per merek, filter warna, pencarian (termasuk kode warna), dan urutan (baru/terlama/nama/jumlah/meter/nilai/warna)
- Statistik total jumlah, nilai, dan total meter; peringatan **stok menipis** (qty ≤ 3)
- Deteksi duplikat saat menambah nama serupa
- **Reset Filter** sekali klik; data & preferensi tersinkron antar tab
- Tema gelap, cetak, ekspor JSON/CSV, impor JSON (gabung atau timpa), urungkan hapus
- Preferensi UI tersimpan di browser

Buka `index.html`. Tanpa dependensi, tanpa API.