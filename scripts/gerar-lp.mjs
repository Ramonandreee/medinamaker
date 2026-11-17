// Monta as partes geradas da LP (ranking, cartazes das aulas, visor) a partir de dados únicos
// e injeta no index.html. Uso: node scripts/gerar-lp.mjs
import { readFileSync, writeFileSync } from "node:fs";

// Fonte: prints oficiais publicados no site (campo "Seguidores" de cada reel).
export const resultados = [
  ["medina-reel-6090491", "Medina", "97.039", "6.090.491"],
  ["medina-reel-593443", "Medina", "51.191", "593.443"],
  ["aluno-1162803", "Aluno", "49.891", "1.162.803"],
  ["aluno-1419576", "Aluno", "36.769", "1.419.576"],
  ["aluno-259397", "Aluno", "10.166", "259.397"],
  ["aluno-81931", "Aluno", "4.770", "81.931"],
  ["aluno-120024", "Aluno", "3.674", "120.024"],
  ["aluno-94664", "Aluno", "2.890", "94.664"],
  ["aluno-202707", "Aluno", "1.068", "202.707"],
  ["aluno-149207", "Aluno", "943", "149.207"],
];
const modulos = [
  "Introdução ao Método", "Construindo Audiência", "Gravação na Prática", "Estratégias e Publicação",
  "Vídeos de React", "Edição com IA", "Conteúdos Bônus", "Edição no CapCut", "Replicando Vídeos Virais",
];
const num = (s) => Number(s.replace(/\./g, ""));
const maior = num(resultados[0][2]);

const [topo, ...resto] = resultados;
const destaque = `<a class="e-destaque" href="/assets/provas/${topo[0]}.webp" data-e-prova="resultados" data-e-indice="0" aria-label="Ampliar resultado do ${topo[1]} com ${topo[2]} seguidores em um único reel">
            <span class="e-destaque__rot">Maior resultado · ${topo[1]}</span>
            <span class="e-destaque__num" data-e-num>${topo[2]}</span>
            <span class="e-destaque__txt">seguidores em um único reel · ${topo[3]} visualizações</span>
            <img src="/assets/provas/recortes/${topo[0]}.webp" width="760" height="454" loading="lazy" decoding="async" alt="Insights do reel: ${topo[3]} visualizações e ${topo[2]} seguidores.">
            <span class="e-ver">Ver print completo</span>
          </a>`;
const linhas = resto
  .map(([arq, quem, seg, views], i) => {
    const w = Math.max(3, (num(seg) / maior) * 100).toFixed(1);
    return `<li><a class="e-linha${quem === "Medina" ? " e-linha--medina" : ""}" style="--w:${w}%" href="/assets/provas/${arq}.webp" data-e-prova="resultados" data-e-indice="${i + 1}" aria-label="Ampliar resultado de ${quem.toLowerCase() === "medina" ? "Medina" : "aluno"} com ${seg} seguidores em um único reel e ${views} visualizações">
              <span class="e-linha__pos" aria-hidden="true">${String(i + 2).padStart(2, "0")}</span>
              <img src="/assets/provas/recortes/${arq}.webp" width="760" height="454" loading="lazy" decoding="async" alt="">
              <span class="e-linha__info"><span class="e-linha__quem">${quem}</span><span class="e-linha__num">${seg}</span><span class="e-linha__views">${views} visualizações</span></span>
              <span class="e-linha__ver" aria-hidden="true">Ver</span>
            </a></li>`;
  })
  .join("\n          ");
const ranking = `${destaque}
          <ol class="e-lista-ranking" start="2">
          ${linhas}
          </ol>`;

const posters = modulos
  .map((t, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `<li class="e-poster"><figure><img src="/assets/aulas/modulo-${n}.webp" width="600" height="800" loading="lazy" decoding="async" alt="Capa do módulo ${i + 1}: ${t}"><figcaption><span>Módulo ${n}</span>${t}</figcaption></figure></li>`;
  })
  .join("\n        ");

const visor = `<dialog class="e-visor" id="e-visor" aria-labelledby="e-visor-titulo">
    <div class="e-visor__topo"><p class="e-visor__titulo" id="e-visor-titulo"></p><button type="button" class="e-visor__botao" data-e-fechar>Fechar <span aria-hidden="true">✕</span></button></div>
    <div class="e-visor__palco"><img id="e-visor-img" alt="" decoding="async"></div>
    <div class="e-visor__base"><button type="button" class="e-visor__botao" data-e-anterior aria-label="Print anterior">←</button><p class="e-visor__legenda" id="e-visor-legenda"></p><button type="button" class="e-visor__botao" data-e-proximo aria-label="Próximo print">→</button></div>
  </dialog>`;

let lp = readFileSync("partes/nova-lp.html", "utf8").replace("<!--RANKING-->", ranking).replace("<!--POSTERS-->", posters);
let html = readFileSync("index.html", "utf8");
const marca = /<!--NOVA-LP-->[\s\S]*?<!--\/NOVA-LP-->|<!--NOVA-LP-->/;
html = html.replace(marca, `<!--NOVA-LP-->\n${lp}    <!--/NOVA-LP-->`);
html = html.replace(/<!--VISOR-->[\s\S]*?<!--\/VISOR-->|<!--VISOR-->/, `<!--VISOR-->\n  ${visor}\n  <!--/VISOR-->`);
const css = readFileSync("partes/estreia.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*/g, "");
html = html.replace(/<style id="e-css">[\s\S]*?<\/style>\n?/, "");
html = html.replace("</head>", `<style id="e-css">${css}</style>\n</head>`);
writeFileSync("index.html", html);
console.log("LP gerada:", resultados.length, "resultados,", modulos.length, "módulos");
