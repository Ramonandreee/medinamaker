# medinamaker.com · landing page do Código da Audiência

Site estático da landing page do lançamento do Código da Audiência (Nahuel Medina). Ponto de partida: cópia fiel do HTML servido em www.medinamaker.com em 17/11/2026 (primeiro commit). Os commits seguintes são otimizações sem mudança de design.

## Publicar no Cloudflare Pages

- Framework preset: **None**
- Build command: *(vazio)*
- Build output directory: `/`

Também funciona como Worker com assets estáticos (`wrangler.jsonc`, deploy command `npx wrangler deploy`, sem build command); `.assetsignore` impede que README e configs sejam servidos.

O arquivo `_headers` define o cache. Teste local: `npx serve .` ou qualquer servidor estático.

## Otimizações em relação ao site original

| Lighthouse mobile (laboratório) | Original | Otimizado |
|---|---|---|
| Performance | 71–90 | 97–99 |
| LCP | 3,0–7,1 s | 2,0–2,5 s |
| CLS | 0,121 | 0,001 |
| Acessibilidade | 96 | 100 |
| Peso no carregamento | 6,6 MB | 435 KB |

- Áudio ambiente: WAV 3,75 MB → MP3 561 KB, baixado só depois do primeiro gesto.
- Prints em WebP, com miniaturas de 480/720 px (`srcset`); o visor abre o original.
- Seis CSS bloqueantes embutidos num único `<style>`.
- Estado da cena aplicado desde o primeiro quadro e altura da história reservada (fim do CLS). Sem JS, o layout de reserva continua.
- Contraste: texto escuro nos CTAs laranja "Ver lançamento online" e consultoria.

## Pendências antes de substituir produção

- **`/api/measurement`**: `measurement.mjs` envia eventos para essa rota, que existe no app atual (servidor). Este repositório é estático e não tem a rota: em produção é preciso manter o backend atual ou implementar uma Function equivalente, senão a mensuração própria para.
- **Fonte**: `assets/sans.woff2` é a OpenAI Sans, fonte proprietária sem licença para este uso. Substituir por uma fonte livre (decisão de design).
- **Pixel Meta e mensuração** só rodam em `medinamaker.com` / `www.medinamaker.com`. Prévias (`*.pages.dev`) não enviam eventos.

## Branch `reestruturacao`

Reestruturação para o lançamento: fonte em `src/` (`pagina.html`, `estilo.css`, `nucleo.mjs`, `visor.mjs`, `medicao.mjs`, páginas legais). `node scripts/build.mjs` gera `index.html`, os módulos versionados e as páginas legais na raiz. Não edite os arquivos gerados.

- Rolagem nativa (sem Lenis e sem encaixe automático); animações só com `transform`/`opacity`; versão leve automática em aparelhos fracos, Save-Data e 2G.
- Pixel da Meta: só em medinamaker.com e depois do aceite no aviso de cookies. Eventos: `Lead` (com `eventID`), `Contact`, `ViewContent`.
- Medição própria: o corpo enviado a `/api/measurement` agora inclui `motion` e eventos novos (`scene_<nome>`, `whatsapp_group_click:<botão>`, `whatsapp_support_click:<tipo>`, `skip_offer:<origem>`). O servidor precisa aceitar esses nomes.
- Pendências marcadas com `[PREENCHER]` e `[VALIDAR COM ADVOGADO]` no rodapé, em `privacidade.html` e em `termos.html`.
