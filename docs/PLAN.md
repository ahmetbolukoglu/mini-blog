# Mini Blog

> Kişisel yazılarınızı taslaklardan yayımlayın ve etiketleyin

## Features
- Yazı taslakları ve yayın yönetimi
- Etiketleme ve kategori yönetimi
- Yazı ekleme, düzenleme ve silme
- Etiketlere göre filtreleme
- Yazıların yayın tarihi yönetimi
- Yazıları sıralama ve arama
- Veri dışa aktarma ve içe aktarma

## Data model
Blog yazıları, her biri başlık, içerik, durum (taslak/yayın), etiketler, yayın tarihi ve oluşturulma tarihi içerir

## Screens
- Yazı listesi ve filtreleme paneli
- Yazı oluşturma/düzenleme formu
- Yazı detay görünümü
- Etiket yönetimi paneli
- Yayınlama ayarları
- Veri dışa aktarma içe aktarma

## Core logic (`src/logic.js`)
| Function | Signature | Purpose |
|---|---|---|
| `createPost` | `(posts, title, content, tags, publishDate) => posts` | Yeni bir blog yazısı oluşturur |
| `updatePost` | `(posts, id, updates) => posts` | Mevcut bir blog yazısını günceller |
| `deletePost` | `(posts, id) => posts` | Bir blog yazısını siler |
| `togglePostStatus` | `(posts, id) => posts` | Yazının durumunu taslak ve yayın arasında değiştirir |
| `filterPostsByTag` | `(posts, tag) => posts` | Belirli bir etikete sahip yazıları filtreler |
| `sortPosts` | `(posts, sortBy, order) => posts` | Yazıları belirtilen kriterlere göre sıralar |
| `validatePost` | `(title, content) => { isValid: boolean, errors: string[] }` | Yazı verilerini doğrular |
| `formatDate` | `(date) => string` | Tarihi GG.AA.YYYY formatına çevirir |
| `formatCurrency` | `(amount) => string` | Tutarı ₺ formatında gösterir |
| `generateExportData` | `(posts) => string` | Yazı verilerini dışa aktarım formatında döndürür |
| `parseImportData` | `(data) => posts` | Dışa aktarılan veriyi yazı nesnelerine çevirir |

## Test plan
- [ ] Yeni bir yazı oluşturulduğunda doğru alanlar doldurulur
- [ ] Yazı düzenleme işlemi doğru şekilde uygulanır
- [ ] Yazı silme işlemi başarılı bir şekilde gerçekleştirilir
- [ ] Yazı durumu taslak ve yayın arasında doğru şekilde değiştirilir
- [ ] Etiketlere göre yazılar doğru şekilde filtrelenir
- [ ] Yazılar tarih sırasına göre doğru şekilde sıralanır
- [ ] Yazı doğrulama işlemi başarısız durumlarda hata mesajı döndürür
- [ ] Tarih formatlama işlemi GG.AA.YYYY formatında çalışır
- [ ] Para birimi formatlama işlemi ₺ formatında çalışır
- [ ] Dışa aktarma işlemi tüm yazı verilerini doğru şekilde döndürür
- [ ] İçe aktarma işlemi dışa aktarılan veriyi doğru şekilde işler
- [ ] Yazı listesinde filtreleme işlemi etiketlere göre doğru çalışır
