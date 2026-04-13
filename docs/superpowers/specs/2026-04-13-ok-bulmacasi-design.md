# Ok Bulmacasi - Antik Yolculuk: Tasarim Dokumani

## Ozet

Grid uzerindeki oklari dogru sirayla cikararak bulmacayi cozen, 10 farkli antik medeniyette gecen puzzle oyunu. Web (HTML5 Canvas + JavaScript) olarak gelistirilecek, sonra iOS'a tasinacak.

---

## Oyun Mekanigi

### Temel Mantik
- Ekranda bir grid uzerinde yonlu oklar bulunur (yukari, asagi, sola, saga)
- Her ok, baktigi yonde engel yoksa (yolu aciksa) disari cekilebilir
- Oyuncu oka dokunur, ok baktigi yonde kayarak cikar
- Ok cikinca arkasinda bos alan kalir, diger oklar serbest kalir
- Yolu kapali bir oka dokunursa yanlis hamle sayilir ve 1 can kaybedilir
- Tum oklar temizlenince seviye tamamlanir

### Ok Davranisi
- Ok, baktigi yonde ekran kenarina kadar yol aciksa cikarilabilir
- Yolda baska ok varsa cikarimaz (kilitli)
- Cikan ok animasyonla kayarak cikis yapar
- Cikis yapan okun yeri noktali/bos alan olarak gosterilir

---

## Seviye Yapisi

### Bolum Sistemi
- 10 bolum, her bolumde 5 seviye = toplam 50 seviye
- Bolumler kilitli, sirayla acilir (onceki bolumu bitirmeden sonrakine gecilemez)
- Yildiz/puanlama yok, sadece gec/geceme

### Bolumler ve Temalar

| Bolum | Medeniyet | Zorluk | Ok Sekilleri | Renk Paleti |
|-------|-----------|--------|--------------|-------------|
| 1 | Misir | Cok kolay | Piramit, Ankh | Altin, kumsal, kahve |
| 2 | Yunan | Kolay | Sutun, vazo | Beyaz, mavi, mermer |
| 3 | Roma | Kolay-Orta | Kilic, kalkan | Kirmizi, altin, tas |
| 4 | Viking | Orta | Gemi, balta | Koyu mavi, ahsap, gri |
| 5 | Osmanli | Orta | Cami silueti, tugra | Bordo, altin, turkuaz |
| 6 | Cin | Orta-Zor | Ejderha, pagoda | Kirmizi, altin, siyah |
| 7 | Maya | Zor | Piramit, gunes takvimi | Yesil, tas, toprak |
| 8 | Hint | Zor | Tac Mahal, lotus | Turuncu, mor, altin |
| 9 | Ortacag Avrupa | Cok zor | Kale, kilic | Koyu gri, bordo, demir |
| 10 | Karisik Final | Uzman | Tum medeniyetlerden | Tum paletler |

### Zorluk Artisi
- Bolum 1-2: Kucuk grid (5x5 - 7x7), az ok, basit siralamalar
- Bolum 3-4: Orta grid (7x7 - 9x9), daha fazla ok, ic ice gecmis yapiler
- Bolum 5-6: Buyuk grid (9x9 - 11x11), karmasik siralamalar
- Bolum 7-8: Buyuk grid, cok katmanli bagimliliklar
- Bolum 9-10: Maksimum grid, en karmasik yapilar

---

## Can Sistemi

- Oyuncu 3 can ile baslar
- Yanlis hamle = 1 can kaybi
- Canlar zamanla yenilenir (her 20-30 dakikada 1 can)
- Reklam izleyerek aninda 1 can kazanilabilir
- Maksimum can sayisi: 3

---

## Ipucu Sistemi

- Her seviyede 1 ucretsiz ipucu
- Ipucu kullanildiginda dogru cikarilabilecek bir ok vurgulanir
- Ek ipucu: reklam izleyerek veya uygulama ici satin alma ile

---

## Gorsel Tasarim

### Genel Yaklasim
- Her bolum kendi medeniyetine uygun arka plan dokusuna sahip
- Arka planlar Leonardo.ai ile olusturulacak
- Dokular: papirusten, parsomene, mermerden ahsaba kadar cesitli

### Arka Plan Dokulari (Bolum Bazli)
1. **Misir**: Papirus kagit dokusu, soluk hiyeroglif suslemeler
2. **Yunan**: Beyaz mermer doku, ince sutun bordur
3. **Roma**: Eski tas doku, mozaik kenarliklari
4. **Viking**: Ahsap/deri doku, runik suslemeler
5. **Osmanli**: Ebru/tezhip dokusu, geometrik desenler
6. **Cin**: Ipek/kagit doku, firca darbesi suslemeler
7. **Maya**: Tas/orman dokusu, oyma desenleri
8. **Hint**: Renkli kumas/mandala dokusu
9. **Ortacag**: Eski harita parsomeni, yanik kenarlar
10. **Final**: Tum dokularin karisimi

### Ok Tasarimi
- Oklar medeniyete uygun renk tonlarinda
- Cikarilabilir oklar: normal renk
- Kilitli oklar: hafif soluk/gri ton
- Cikan okun yolu: vurgulu renk (kirmizi/altin)
- Bos alan: noktali desen

### UI Elemanlari
- Ust bar: Geri butonu, seviye adi, zorluk etiketi
- Can gostergesi: 3 ikon (medeniyete gore degisebilir)
- Ipucu butonu: Sag ust kosede
- Seviye tamamlama ekrani: Basari animasyonu + sonraki seviye butonu

---

## Monetizasyon

### Reklam
- Can yenileme: Reklam izle = aninda 1 can
- Ipucu: Reklam izle = 1 ek ipucu
- Seviyeler arasi: Banner veya interstitial reklam (opsiyonel)

### Uygulama Ici Satin Alma
- Can paketi (ornegin 10 can)
- Ipucu paketi (ornegin 10 ipucu)
- Reklam kaldirma (premium)

---

## Teknik Mimari

### Platform
- Birincil: Web (HTML5 + JavaScript + Canvas API)
- Hedef: iOS (Capacitor/PWA ile sarmalama)
- Test: Windows tarayici + Android telefon tarayicisi

### Dosya Yapisi
```
ok-oyunu/
├── index.html          # Ana HTML dosyasi
├── css/
│   └── style.css       # Stiller
├── js/
│   ├── main.js         # Giris noktasi, oyun dongusu
│   ├── game.js         # Oyun mekanigi (grid, ok yonetimi)
│   ├── level.js        # Seviye yukleme ve yonetim
│   ├── arrow.js        # Ok sinifi (yon, konum, durum)
│   ├── renderer.js     # Canvas cizim islemleri
│   ├── ui.js           # UI yonetimi (menu, popup, can)
│   ├── hint.js         # Ipucu sistemi
│   ├── lives.js        # Can sistemi ve zamanlayici
│   ├── storage.js      # LocalStorage ile kayit
│   └── levels/         # Seviye verileri
│       ├── egypt.js
│       ├── greek.js
│       ├── rome.js
│       ├── viking.js
│       ├── ottoman.js
│       ├── china.js
│       ├── maya.js
│       ├── india.js
│       ├── medieval.js
│       └── final.js
├── assets/
│   ├── backgrounds/    # Leonardo.ai ile olusturulan arka planlar
│   ├── icons/          # UI ikonlari
│   └── fonts/          # Ozel fontlar
└── docs/
    └── superpowers/
        └── specs/
```

### Veri Kaydetme
- LocalStorage kullanilacak
- Kaydedilen veriler: acik bolumler, tamamlanan seviyeler, can sayisi, son can yenilenme zamani, ipucu sayisi

### Seviye Veri Formati
Her seviye JSON olarak tanimlanir:
```json
{
  "id": "egypt_1",
  "chapter": 1,
  "level": 1,
  "gridWidth": 5,
  "gridHeight": 5,
  "shape": "pyramid",
  "arrows": [
    { "x": 2, "y": 0, "direction": "down" },
    { "x": 1, "y": 1, "direction": "right" },
    { "x": 3, "y": 1, "direction": "left" }
  ],
  "solution": [0, 2, 1]
}
```

---

## Ekranlar

1. **Ana Menu**: Oyun logosu + "Oyna" butonu + ayarlar
2. **Bolum Secim**: 10 bolum kartlari (kilitli/acik), medeniyet isimleri ve ikonu
3. **Seviye Secim**: Secilen bolumun 5 seviyesi (tamamlanan/acik/kilitli)
4. **Oyun Ekrani**: Grid + oklar + can + ipucu butonu + geri butonu
5. **Seviye Tamamlama**: Basari mesaji + sonraki seviye butonu
6. **Can Bitti Ekrani**: "Reklam izle" veya "Bekle" secenekleri

---

## Ses
- Su an ses yok
- Ileride eklenecek: arka plan muzigi (medeniyete uygun) + ses efektleri

---

## Kapsam Disi (Sonraki Surumlerde)
- Ses ve muzik
- Coklu oyuncu / skor tablosu
- Ek bolum paketleri (DLC)
- Gunluk bulmaca modu
- Basarimlar / achievements sistemi
