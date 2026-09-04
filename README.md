# Doviz Burosu Yönetim Sistemi

PostgreSQL + NestJS + React tabanlı, çok şubeli, çok dilli (TR/EN/AR/KU/FA, RTL destekli) bir döviz bürosu yönetim sistemi.

## İçerik

- **Backend:** NestJS 10, TypeScript, Prisma ORM, PostgreSQL 16, JWT auth, Zod validation, Pino logger
- **Frontend:** Vite 5, React 18, Tailwind CSS, shadcn/ui stil bileşenler, Zustand, TanStack Query/Table, i18next (5 dil), Recharts, ExcelJS
- **Araçlar:** pnpm workspaces, Vitest, Docker Compose

## Modüller

1. **Vezne İşlemleri** — alış/satış fişi, düzeltme, transfer, banknot sayımı, izleme, bakiye
2. **Kur İşlemleri** — ham serbest, serbest, kapanış kurları, kur tanımları, eski kurlar
3. **Yönetici İşlemleri** — kur/fiş/transfer/hareket yönetimi, gün sonu devirleri
5. **Raporlar** — fiş listeleme, günlük detay, karlılık, personel, kur sapma, değişiklik, kasa defteri
6. **Ana Kasa** — hesap/hareket/defter/bakiye
7. **Cari** — kart/hareket/bakiye
8. **Muhasebe** — hesap planı, fiş, açılış/kapanış, mali yıl, defter-i kebir
9. **Değişiklik & Kur Sapma Takip** — tüm mutasyonlarda `ChangeAuditLog` + kur değişim log
10. **Teknik** — telefon, yedekleme, format, dosya, genel ayarlar, iş tanımları

## Kurulum

### Gereksinimler

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose (opsiyonel, hızlı başlangıç için)

### Docker ile (önerilen)

```bash
cp .env.example .env
# Istege bagli: JWT secret'leri degistirin
docker compose -f docker/docker-compose.yml up -d
```

Servisler:
- Web: http://localhost:5173
- API: http://localhost:4000/api
- API Docs: http://localhost:4000/api/docs

Veritabanı migrate + seed API konteyneri açılırken otomatik yapılır.

### Geliştirme (lokal)

```bash
# 1) Bagimliliklari kur
pnpm install

# 2) .env dosyasi olustur
cp .env.example .env
# PostgreSQL ayarlarini lokal db'ye gore duzenleyin

# 3) Veritabanini hazirla
pnpm db:migrate
pnpm db:seed

# 4) Gelistirme modunda calistir
pnpm dev:api   # http://localhost:4000
pnpm dev:web   # http://localhost:5173
```

## Varsayılan Hesaplar

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| `admin`   | `admin123` | Admin (tüm yetkiler) |
| `vezne`   | `vezne123` | Veznedar (vezne + kur + raporlar) |

## Komutlar

```bash
pnpm dev:api           # NestJS dev server
pnpm dev:web           # Vite dev server
pnpm build             # Tum uygulamalari build et
pnpm lint              # Lint
pnpm format            # Prettier format
pnpm test              # Tum testler
pnpm db:migrate        # Yeni migration olustur
pnpm db:seed           # Seed verilerini uygula
pnpm db:studio         # Prisma Studio
pnpm docker:up         # Docker compose up
pnpm docker:down       # Docker compose down
```

## Mimari Notlar

- **Soft delete:** tüm ana tablolarda `deletedAt` ile.
- **Audit:** `ChangeAuditLog` her UPDATE/DELETE/CREATE için Prisma middleware üzerinden otomatik dolar (userId, branchId, IP).
- **Multi-branch:** her kullanıcı `UserBranchAssignment` üzerinden birden çok şubeye bağlı, login'de branchId seçilebilir.
- **Rate spread:** `Currency.buySpread`/`sellSpread` ham serbest kurdan serbest kur otomatik hesaplanır.
- **i18n:** AR/KU/FA için `dir="rtl"` otomatik; para/tarih formatlama locale-aware.
- **Raporlar:** Excel/CSV export + tarayıcı yazdırma desteği.

## Testler

Vitest ile yazıldı:
- `packages/shared` utils (para hesaplama, karlılık)
- Zod şema doğrulama
- Vezne fiş düzeltme mantığı

```bash
pnpm test
```

## Dizin Yapısı

```
Doviz/
├── apps/
│   ├── api/                NestJS API
│   │   ├── prisma/         Schema + seed
│   │   ├── src/
│   │   │   ├── common/     Guards, decorators, types
│   │   │   ├── prisma/     Prisma service + audit middleware
│   │   │   └── modules/    auth, users, branches, vezne, kur, kasa, cari,
│   │   │                   muhasebe, raporlar, teknik, audit
│   │   └── test/           Vitest testler
│   └── web/                React + Vite
│       └── src/
│           ├── components/ ui + shared
│           ├── lib/        api client, i18n, formatters
│           ├── pages/      modul sayfalari
│           └── stores/     Zustand
├── packages/
│   ├── shared/             Tipler, enum'lar, Zod şemaları, utils
│   └── i18n/               Çeviri dosyaları (5 dil)
└── docker/                 docker-compose + Dockerfile
```