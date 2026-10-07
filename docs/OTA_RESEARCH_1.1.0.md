# Okchu 1.1.0: içerik güncellemeleri ve iPhone Duo sınırları

Araştırma tarihi: 7 Ekim 2026. Apple hakkındaki bilgiler aşağıdaki birincil Apple kaynaklarına dayanır. Bu belge App Review onayı, uzaktan yayına alma veya fiziksel Duo testi iddiası içermez.

## Apple kuralları ve bu sürümün kapsamı

App Review 2.5.2, uygulamanın özelliklerini veya işlevini değiştiren indirilebilir kodu sınırlar. 2.3.1, yeni özellik ve değişikliklerin inceleme notlarında açıklanmasını; 2.1, inceleme için gerekli servislerin çalışmasını ister. Bir OTA sağlayıcısı kullanmak bu yükümlülüklerin yerini tutmaz. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

Güncel Developer Program License Agreement, yorumlanan kod için uygulamanın ilan edilen ana amacı, işletim sistemi güvenliği ve başka uygulamalar için mağaza oluşturmama koşullarını belirtir. Güncel metinde ilgili bölüm **3.3.1(B), Executable Code**; eski belgelerdeki 3.3.2 numarası güncel başlık değildir. Bu koşullar tüm uzaktan JavaScript değişikliklerinin otomatik kabul edildiği anlamına gelmez. Geliştirici hesabında kabul edilen İngilizce sözleşme bağlayıcı metindir. [Güncel Apple sözleşmesi](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/), [sözleşme sürümleri hakkında Apple](https://developer.apple.com/support/terms).

**Uygulama kararı:** bu sürüm yalnızca mevcut içerik metinleri ve mevcut reklamları devre dışı bırakabilen veri güncellemeleri alır. Dokunma sistemi, çizim, bulmaca kuralları, JavaScript/CSS/HTML, yeni özellikler, native kod, SDK, izinler, satın alma ve Duo düzeni App Store paketiyle dağıtılır. Bu dar kanal, gelecekteki her küçük kod düzeltmesini OTA ile göndermeye izin vermez. Mini uygulama dağıtımı için 4.7 kapsamı bu oyunun güncelleme yoluna dönüştürülmedi.

## Önceki kaynak ve eklenen uygulama

OTA öncesi incelenen commit: `3ec2f459991e10ae6eec8f650f0b95e6655ba651`. `capacitor.config.json` yerel `www` dizinini kullanır; `server.url` veya bir updater SDK yoktu. `build-www.mjs`, JS/CSS/HTML/dil/görselleri native pakete kopyalar. `js/levels.js` kampanyayı yerel ES modüllerinden yükler. `js/main.js` service worker'ı yalnızca tarayıcıda kaydeder; bu PWA önbelleği native OTA değildir.

Bu çalışma `js/content-updates.js`, `ota/stable.json`, `tests/content-updates.mjs` ve `js/i18n.js` içindeki dar metin hook'unu ekledi. Son kaynak kontrolünde root entegrasyonu da mevcut: `main.js`, cached snapshot'ı reklam başlangıcından önce alıyor ve ağı arka planda başlatıyor; `ads.js` aynı bare module URL'sinden opt-out durumunu kullanıyor. Yeni native paket oluşturulup doğrulanmalıdır. Mevcut `export-1.1.0-148-touch/App.ipa` bu değişikliklerden **önceki** pakettir.

Capacitor'un `server.url` ayarı bir güncelleme çözümü olarak kullanılmadı: resmi belge bu ayarı geliştirme/live reload için tanımlar ve üretim kullanımını önermez. [Capacitor configuration](https://capacitorjs.com/docs/config).

## İçerik kanalı sözleşmesi

- Sabit kaynak: `https://raw.githubusercontent.com/arslanaytac11-alt/okchu/main/ota/stable.json`. HTTPS dışında kaynak, yönlendirme ve başka son URL kabul edilmez. İstek cookie veya uygulama tarafından üretilmiş cihaz kimliği göndermez; sunucunun normal IP/HTTP kayıtları ayrıca gizlilik değerlendirmesine dahildir.
- Tüm alanlar zorunlu: `schemaVersion:1`, `appVersion:"1.1.0"`, `nativeBuild:148`, pozitif güvenli tamsayı `revision`, `texts`, `disableAds`. Başka alanlar reddedilir.
- Metin dilleri: `tr`, `en`, `es`, `fr`, `ja`. İzin verilen 21 anahtar: `game.zoom_hint` ve `civilizations.1..10.text` / `.mystery`. Olmayan `game.play_hint`, mağaza açıklaması, gizlilik, satın alma, puan veya kurallar güncellenmez.
- Metinler düz yazıdır; HTML, HTML entity, kontrol/gizli yön işaretleri, tek başına surrogate, boş/aşırı uzun metin ve prototype anahtarları reddedilir. İndirilmiş veri eval/import/innerHTML ile çalıştırılmaz.
- `disableAds` yalnızca `banner`, `interstitial`, `rewarded` için `true` kabul eder. `false`, yeni reklam ID'si, sıklık, izin veya zorunlu reklam alanı yoktur. Alanın sonraki revizyonda çıkarılması yerel incelenmiş varsayılana döner; UMP, Premium, yaşam döngüsü ve yerel sıklık sınırları her durumda geçerlidir.
- Maksimum **32 KB UTF-8**; stream okunurken sınır aşımı iptal edilir. İstek en fazla 4 saniye bekler. Ağ/HTTP/parse/versiyon/UTF-8/storage hatasında geçerli eski içerik veya paket içeriği korunur; oyun açılışı ağa bağımlı olmaz.
- `loadCachedContentUpdates()` başlangıçta doğrulanmış snapshot'ı bir kez alır. `initializeContentUpdates()` yeni revizyonu yalnızca **bir sonraki uygulama açılışı** için saklar. Aktif bulmaca, dil veya reklam durumu ağ yanıtıyla aniden değişmez. Aynı/eski revizyon yeni staged veriyi geriye alamaz.
- Native dışındaki tarayıcı ve yerel kontrol modunda bu kanal storage okumaz/yazmaz ve ağ isteği yapmaz. Gizlilik ve inceleme dışında kullanıcı ilerlemesine dokunmaz.
- `main.js`, `ads.js`, `i18n.js` bu modülü **aynı URL/query specifier** ile paylaşmalıdır; farklı import URL'leri ayrı snapshot oluşturabilir.

Başlangıç API'si: önce `loadCachedContentUpdates()`, sonra mevcut dil/reklam açılışı; `initializeContentUpdates()` arka planda çalışır. `getContentText(lang,key)` yalnızca izinli aktif override veya `undefined` döndürür. `isAdTypeDisabled(type)` yalnızca aktif opt-out durumunu döndürür.

## Yayınlama ve geri dönüş

Yerel `ota/stable.json`, **revizyon 1, boş metinler ve boş reklam bayrakları** içerir. Bu başlangıç paketi oyun davranışını değiştirmez. Çalışan OTA iddiası için dosyanın mevcut kamuya açık depodaki `main/ota/stable.json` yoluna yayınlanması, HTTPS 200/gerçek JSON ve native çapraz-origin fetch'in doğrulanması gerekir. Araştırma sırasındaki salt-okunur kontrol **404** döndürdü; bu, sonraki yayınların durumu hakkında iddia değildir. Yerel dosya yazılması bu adımların tamamlandığı anlamına gelmez. Bu çalışma uzaktaki depoya yayın yapmadı.

Güncelleme yayınlanırken metinler bu whitelist kapsamında kalır, revizyon artırılır, validator/testler çalıştırılır ve kontrollü Git değişikliği gözden geçirilir. Geri dönüş için eski iyi içerik **daha yüksek revizyonla** yayımlanır. Eski revizyon numarasına dönmek istemcinin monotonluk koruması nedeniyle işe yaramaz. Endpoint geçici yoksa oyun paket içeriğiyle devam eder. Native build numarası değişirse uyumlu içerik hedefi ve paket sabitleri birlikte yeniden incelenir.

İnceleme notu taslağı:

> The game ships its executable code, puzzles and assets in the App Store bundle and works offline. An optional HTTPS JSON feed can revise existing help/story text and opt out of existing ad types. Its schema and size are bounded; it cannot deliver code, puzzle rules, native capabilities, purchases, permissions or additional software. Downloads are staged until the next launch. Missing or invalid responses retain bundled or previously validated content. Premium, UMP consent and local ad policy remain authoritative.

Bu taslak gerçek entegrasyon ve çalışan endpoint doğrulandıktan sonra kullanılmalıdır; onay garantisi değildir.

## Capgo / Appflow değerlendirmesi

Capgo'nun kendi uyumluluk belgesi native binary/plugin/izinleri değiştirmediğini ve bireysel mağaza onayını garanti edemediğini belirtir; maddi işlev/native değişiklikleri normal sürüme yönlendirir. Quickstart sayfası eski sözleşme numaralarını da aktarır; güncel Apple metni esas alınmalıdır. Bu küçük veri kanalı için Capgo SDK, yeni hesap, anahtar, cihaz envanteri veya ücretli servis eklenmedi. [Capgo compliance](https://capgo.app/docs/live-updates/compliance/), [Capgo quickstart](https://capgo.app/docs/getting-started/quickstart/).

Appflow web bundle/channel + native SDK yolunu belgeliyor. Bu kurulum mevcut oyunda yok ve bu sürümde seçilmedi. [Appflow Live Updates](https://ionic.io/docs/appflow/deploy/deploy-live-update). Bu sağlayıcıların teknik kabiliyeti App Review sınırlarına istisna sağlamaz.

## iPhone Duo: destek kodu ve doğrulama sınırı

Apple'ın güncel Duo merkezinde Xcode **27.1 Release Candidate** yer alıyor. Resmi hazırlık anlatımı SDK ile derleme, uyarlanabilir ölçüler, asimetrik safe area, ekran/poz ve Split View testlerini kapsıyor. [Apple Duo merkezi](https://developer.apple.com/iphone-duo/), [Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/).

Public UIKit API'leri `UIView.reservedRegions(kind:options:)` (`.division`, `.occlusion`, `.includeInactive`) ve `UIHingeInteraction` olarak belgeleniyor. Safe area tek başına bu bölgelerin yerine geçmez. Açık/düz cihazdaki inactive hinge ile katlanmış active bölge ayrımı yapılmalıdır. [UIKit updates](https://developer.apple.com/documentation/Updates/UIKit), [adaptive layout Tech Talk](https://developer.apple.com/videos/play/tech-talks/111463/), [Duo tasarım rehberi](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo).

Mevcut `OkchuViewController.swift`, iOS27.1+ üzerinde aynı bridged WKWebView'ı tam pencere parent içinde tutar, aktif division/occlusion frame'lerini parent koordinatlarında alır ve `DuoViewport.largestSafeRect` ile tüm WebView'ı tek güvenli dikdörtgene yerleştirir. Hinge/property/layout/safe-area değişimleri tekrar ölçer. Tam kapanmada interaktif WebView saklanır; eski iOS bu dalı kullanmaz. Reklam pane olayı uygulamanın kendi `OkchuAdViewportDidChange` bildirimidir, bir UIKit reserved-region bildirimi değildir. CSS dört safe-area yönünü kullanır. Bu bir kaynak incelemesidir.

`release-verification-touch.json`, önceki touch paketinin SDK `iphoneos27.1` / minimum iOS15 / derlenen Duo helper ve callback bağlantısını doğrular; `physical_duo_verified:false` açıkça kaydedilir. 4.971 saf Swift geometri kontrolü ve tarayıcı büyük/rotated viewport testleri fiziksel katlanma veya gerçek UIKit reserved-region olaylarını kanıtlamaz. Güncel uygulamada dış/iç ekran, kısmi fold, book/tabletop, kamera active/inactive, iki Split View yanı, dokunma/pinch/ad/consent/IAP overlay ve sürmekte olan oyun verisinin korunması native UI/cihazda ayrıca gözlenmelidir. “Fiziksel Duo'da tamamen doğrulandı” iddiası şu anda uygun değildir.

## Bu değişikliğin test kanıtı

`node tests/content-updates.mjs` **18 grup, çıkış 0**: gerçek validator/client/cache/i18n hook'u; bozuk şema/HTML/proto/bidi/UTF-8 ve byte sınırı; browser/kontrol modu sıfır işlem; immutable launch ve yeni-launch geçişi; monoton revizyon; eşzamanlı istek; HTTP/redirect/stream/timeout/storage hataları; yalnızca disable edilen reklam tipleri. Network transport mock'tur; uzaktaki endpoint/native CORS veya mağaza onayı testi değildir. Root'un ana açılış/reklam bağlantılarının aggregate testleri ve yeni paket doğrulaması ayrıca kaydedilmelidir.
