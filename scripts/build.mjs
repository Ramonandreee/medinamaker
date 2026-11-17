// Monta index.html a partir de src/. Uso: node scripts/build.mjs  (dados numa fonte única; gera também o JSON-LD)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const GRUPO = "https://chat.whatsapp.com/EIIP5liWiIH7LLlzNxBFT4?s=cl&amp;p=i&amp;iam=2";
const SUPORTE = "https://wa.me/message/6UXGA2JTDXUPH1";
// [arquivo, autor, seguidores, visualizações, largura, altura do recorte] — números dos prints oficiais
const reels = [
  ["medina-reel-6090491", "Medina", "97.039", "6.090.491", 760, 454], ["medina-reel-593443", "Medina", "51.191", "593.443", 760, 454],
  ["aluno-1162803", "Aluno", "49.891", "1.162.803", 760, 457], ["aluno-1419576", "Aluno", "36.769", "1.419.576", 760, 452],
  ["aluno-259397", "Aluno", "10.166", "259.397", 707, 436], ["aluno-81931", "Aluno", "4.770", "81.931", 760, 453],
  ["aluno-120024", "Aluno", "3.674", "120.024", 760, 452], ["aluno-94664", "Aluno", "2.890", "94.664", 707, 436],
  ["aluno-202707", "Aluno", "1.068", "202.707", 760, 487], ["aluno-149207", "Aluno", "943", "149.207", 760, 491],
];
const modulos = ["Introdução ao Método", "Construindo Audiência", "Gravação na Prática", "Estratégias e Publicação", "Vídeos de React", "Edição com IA", "Conteúdos Bônus", "Edição no CapCut", "Replicando Vídeos Virais"];
const faq = [
  ["Como funciona o Método Código da Audiência online?", "O lançamento do método online é em <strong>12 de dezembro</strong>. O método tem aulas gravadas com acesso por <strong>um ano (12 meses)</strong> para você assistir no seu ritmo."],
  ["Quando vou saber o valor?", "O valor do método online é revelado no <strong>grupo oficial do lançamento</strong>. Entrar no grupo não obriga você a comprar."],
  ["O que vou aprender sobre estratégia e edição?", "As aulas abordam estratégia de atração, organização do perfil e edição de vídeos para aplicar o método ao seu conteúdo."],
  ["Tenho acesso a um grupo de alunos?", "<strong>Sim.</strong> O método inclui acesso ao <strong>grupo de alunos do Código da Audiência</strong>, onde os alunos compartilham experiências e resultados."],
  ["Por quanto tempo terei acesso ao curso gravado?", "Você terá acesso completo a todas as aulas gravadas, atualizações e materiais complementares por <strong>1 ano (12 meses)</strong>. Isso permite que você assista no seu próprio ritmo e reveja o conteúdo quantas vezes quiser."],
  ["E se eu comprar e perceber que o método não é para mim?", "Você tem uma <strong>garantia incondicional de 7 dias</strong>. Se por qualquer motivo você assistir às aulas e achar que o método não serve para o seu momento, basta pedir o reembolso ao nosso suporte dentro desse prazo e nós devolvemos 100% do seu dinheiro, sem burocracia."],
];
const num = t => Number(t.replace(/\./g, ""));
// Reels do Medina: número grande e o recorte legível do print, direto na tela.
const prova = ([arq, , seg, views, w, h]) =>
  `<figure class="prova" data-r><figcaption><span class="prova__num">${seg}</span><span class="prova__txt">seguidores em um único reel · ${views} visualizações</span></figcaption>` +
  `<div class="prova__img"><img src="/assets/provas/recortes/${arq}.webp?v=__V__" width="${w}" height="${h}" loading="lazy" decoding="async" alt="Insights do reel do Medina: ${views} visualizações e ${seg} seguidores."></div></figure>`;
// Alunos: ranking com barras proporcionais; o print do item ativo aparece na tela acima.
const alunos = reels.slice(2), maior = num(alunos[0][2]);
const prints = alunos.map(([arq, , seg, views, w, h], i) =>
  `<img${i ? "" : ' class="on"'} data-print="${i}" src="/assets/provas/recortes/${arq}.webp?v=__V__" width="${w}" height="${h}" loading="lazy" decoding="async" alt="Insights do reel de um aluno: ${views} visualizações e ${seg} seguidores.">`).join("");
const linhas = alunos.map(([, , seg, views], i) =>
  `<li><button type="button" data-linha="${i}" aria-pressed="${i ? "false" : "true"}" style="--w:${Math.max(4, num(seg) / maior * 100).toFixed(1)}%"><b>${seg}</b><small>seguidores · ${views} views</small></button></li>`).join("");
const jsonld = [
  { "@context": "https://schema.org", "@type": "Course", name: "Método Código da Audiência", description: "Método online de Nahuel Medina sobre posicionamento, conteúdo e crescimento no Instagram com vídeos curtos. 9 módulos e 23 aulas gravadas, com acesso por 12 meses.", inLanguage: "pt-BR", url: "https://www.medinamaker.com/", provider: { "@type": "Person", name: "Nahuel Medina", url: "https://www.medinamaker.com/" }, hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", startDate: "2026-12-12" } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })) },
];
const css = readFileSync("src/estilo.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*/g, "");
let html = readFileSync("src/pagina.html", "utf8")
  .replace("__CSS__", css)
  .replace("__JSONLD__", JSON.stringify(jsonld))
  .replace("__REELS_MEDINA__", reels.slice(0, 2).map(prova).join(""))
  .replace("__ALUNOS_PRINTS__", prints).replace("__ALUNOS_LINHAS__", linhas)
  .replace("__CAPAS__", modulos.map((t, i) => { const n = String(i + 1).padStart(2, "0"); return `<li data-r><figure><img src="/assets/aulas/modulo-${n}.webp?v=__V__" width="600" height="800" loading="lazy" decoding="async" alt="Capa do módulo ${i + 1}: ${t}"><figcaption><span>Módulo ${n}</span>${t}</figcaption></figure></li>`; }).join(""))
  .replace("__FAQ__", faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join(""))
  .replaceAll("__GRUPO__", GRUPO).replaceAll("__SUPORTE__", SUPORTE);
const fontes = ["nucleo.mjs", "medicao.mjs"].map(f => readFileSync(`src/${f}`, "utf8"));
const V = createHash("sha1").update(html + fontes.join("")).digest("hex").slice(0, 8);
writeFileSync("index.html", html.replaceAll("__V__", V));
["nucleo.mjs", "medicao.mjs"].forEach((f, i) => writeFileSync(f, fontes[i].replaceAll("__V__", V)));
for (const f of ["privacidade.html", "termos.html"]) writeFileSync(f, readFileSync(`src/${f}`, "utf8").replace("__CSS_LEGAL__", readFileSync("src/legal.css", "utf8").replace(/\n\s*/g, "")));
console.log("versão", V, "| index.html", (Buffer.byteLength(html) / 1024).toFixed(1), "KB");
