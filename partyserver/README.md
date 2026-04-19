# Komikoyun Multiplayer Server (PartyKit)

## Deploy

Terminalde:

```bash
cd ~/Documents/Claude/Projects/komikoyun
npx partykit login   # tarayıcı açılır, GitHub ile giriş yap
npx partykit deploy
```

Deploy sonrası sana şöyle bir URL verilecek:

```
komikoyun-mp.<kullanıcı-adı>.partykit.dev
```

Bu URL'yi `lib/multiplayer.ts` dosyasındaki `PARTY_HOST` default değerine yaz.

Ya da deploy ederken:

```bash
NEXT_PUBLIC_PARTY_HOST=komikoyun-mp.<kullanıcı>.partykit.dev npm run build
vercel --prod
```

Frontend bu environment değerini kullanacak.

## Geliştirme

```bash
npx partykit dev
```

Yerel 1999 portunda başlar. Frontend'te `NEXT_PUBLIC_PARTY_HOST=localhost:1999 npm run dev` ile test et.

## Maliyet

PartyKit free tier:
- Milyonlarca WebSocket bağlantısı/ay free
- Cloudflare Workers üzerinde — zero cold start
- Aile/arkadaş ölçeğinde asla ücret kesilmez

## Ne yapıyor?

- Her oyuncunun `{id, nickname, x, y, z, yaw, scale, hp, currentWeapon}` durumunu saklar
- Client'lar 80ms'de bir state gönderir
- Server 100ms'de bir tüm oyuncuları broadcast eder
- Bir oyuncu ayrılınca diğerlerine bildirilir
- Aksiyonlar (yumruk, silah, iksir) broadcast edilir
