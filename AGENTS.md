# AGENTS.md — vereda · ciclo de vida do serviço + SLM

Passagem de bastão para quem continuar este projeto (Codex ou outro agente).
Leia inteiro antes de mexer: quase toda regra aqui custou um bug medido.

**No ar:** https://andreybueno-git.github.io/vereda-ciclo-de-vida/
**Repo:** `andreybueno-git/vereda-ciclo-de-vida` (branch `main`, GitHub Pages publica a raiz)
**Dono:** Andrey (aluno; fala português do Brasil, escreve rápido e com erro de digitação — entenda a intenção)

---

## 1. O que é

Apresentação em HTML (um arquivo só, `index.html`) da disciplina **Gerenciamento de
Serviços de TI**, aplicada à **vereda**: marca de luminárias e peças decorativas
impressas em 3D, de Palmas-TO ("a luz do Cerrado dentro de casa").

Junta **duas atividades da disciplina** numa apresentação só:

| Folha | Conteúdo | Onde está no deck |
|---|---|---|
| **12/09/2026** · Planejamento estratégico e ciclo de vida do serviço (escrita à mão pelo aluno) | 5 etapas do ciclo; "Novo Serviço" com PROCESSO 1–5 (Estratégia de TI, Portfólio, Demanda, Financeiro, Relacionamento com o Negócio); Decisão estratégica sobre IA (1 aplicação, 2 benefício, 3 viabilidade, 4 risco, 5 decisão) | capa, 01–05, 06 |
| **19/09/2026** · Desenho do Serviço: Gerenciamento do Nível de Serviço (SLM) | itens 1 escopo, 2 requisitos, 3 processos, 4 tecnologia, 5 métricas e KPIs, 6 uso de IA, 7 fornecedores, 8 fluxo | 02·1 a 02·5 (dentro do Desenho: SLM é processo do Desenho no ITIL v3) |
| **19/09/2026** · Segurança, continuidade e qualidade do uso de IA | a) risco, b) proteção e supervisão, c) continuidade, d) qualidade — "retomem a IA do item 6" | 06·1 e 06·2 |

As respostas da folha de SLM estão em **`docs/respostas-slm.json`** (fonte dos slides) e
a versão para imprimir/copiar à mão em **`docs/folha-slm-respondida.html`**.

**Estilo:** BRUTALISMO. Tipografia Fraunces enorme em caixa-alta, campos de cor com
**parada dura** (verde e barro cortam em 58 % da largura, branco em 62 %), sombra
offset sem desfoque, zero raio. **Um objeto 3D (three.js) atravessa o deck e MORFA**
entre as etapas (nuvem de pontos → fatias → primeira camada → peça acesa → estilhaça e
remonta outra peça). No fim entra o vídeo da luminária real acendendo.

---

## 2. Os 16 blocos

Cada `<section class="bloco ...">` tem `data-titulo`, `data-objeto` (texto do rodapé) e
`data-estado` (estado do morph, 0 a 4). O rodapé e o objeto leem desses atributos:
**não existe lista paralela** — para inserir slide, só inserir a section.

| # | data-titulo | fundo | estado | origem |
|---|---|---|---|---|
| 0 | Abertura (hero) | `bloco--hero` | 0 | nova (25/09) |
| 1 | Capa | vazado | 0 | folha 12/09 |
| 2 | Estratégia (os 5 processos) | vazado | 0.45 | folha 12/09 |
| 3 | Desenho | verde | 1.2 | folha 12/09 |
| 4 | Escopo e requisitos (02·1) | branco | 1.3 | SLM itens 1–2 |
| 5 | Processo SLM (02·2) | vazado | 1.4 | SLM item 3 |
| 6 | Métricas e KPIs (02·3) | branco | 1.55 | SLM item 5 |
| 7 | Tecnologia e fornecedores (02·4) | verde | 1.65 | SLM itens 4 e 7 |
| 8 | Fluxo do desenho (02·5) | branco | 1.8 | SLM item 8 |
| 9 | Transição | vazado | 2.15 | folha 12/09 |
| 10 | Operação | barro | 3.15 | folha 12/09 |
| 11 | Melhoria | vazado | 3.9 | folha 12/09 |
| 12 | IA (decisão 1–5) | branco | 4 | folha 12/09 |
| 13 | IA: risco e proteção (06·1) | barro | 4 | SLM item 6 + a + b |
| 14 | IA: continuidade e qualidade (06·2) | verde | 4 | SLM c + d |
| 15 | Fim (vídeo da peça acendendo) | vazado | 4 | — |

---

## 3. Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O deck inteiro: CSS, HTML e o script principal. Fontes embutidas em base64 (~150 KB). |
| `objeto.js` | O objeto 3D que morfa (`window.iniciarObjeto`). |
| `luz.js` | O hero: simulação de fluido que acende a luminária (`window.iniciarLuz`). |
| `three.min.js` | three.js LOCAL. Não trocar por CDN. |
| `assets/peca-acende.mp4`, `peca-poster.jpg` | Vídeo do bloco final (render do Blender). |
| `assets/hero/apagada.jpg`, `acesa.jpg` | Os dois quadros do hero, mesma câmera, 1920×1080. (Os `.png` brutos estão no `.gitignore`.) |
| `render_acende.py` | Blender: renderiza o vídeo da peça acendendo. |
| `render_hero.py` | Blender: renderiza os dois quadros do hero. `Blender -b -P render_hero.py` |
| `docs/respostas-slm.json` | Respostas da folha de SLM + os 10 problemas que os céticos apontaram. |
| `docs/folha-slm-respondida.html` | Folha respondida para imprimir (A4). PDF: abrir no Chrome e imprimir, ou `Chrome --headless=new --print-to-pdf=saida.pdf docs/folha-slm-respondida.html`. |
| `README.md` | Documentação para humanos. Mantenha em dia junto com este arquivo. |

---

## 4. Rodar e publicar

```bash
python3 -m http.server 8811 --directory ~/Documents/Projetos/vereda-itil
# abrir http://localhost:8811
```

Precisa de HTTP (WebGL e vídeo não rodam em `file://` direito).

**Publicar = push na `main`.** O GitHub Pages leva ~40 s:

```bash
git push origin main
gh run list --limit 1          # esperar "completed success"
```

Se o `push` cair com "remote end hung up", é a rede: repita. Se um `git` travar e deixar
`.git/index.lock`, confira que nenhum git está rodando nessa pasta e só então apague.

**Navegar no deck:** setas / PageUp / PageDown / espaço / Enter / Backspace, `Home`, `End`.
`F` = tela cheia. `L` = acende a peça na abertura.

---

## 5. Regras do dono (não negociáveis)

1. **Commits sem `Co-Authored-By`** — é trabalho de faculdade; o dono pediu. Mensagem em
   português, explicando o PORQUÊ e o que foi MEDIDO (veja `git log`).
2. **Não mencione Prolog** para o dono. O projeto não tem nada a ver com o trabalho de
   Prolog dele; a simulação de fluido foi reaproveitada como técnica, mas ele não quer
   essa associação.
3. **Não invente número.** Todo número da vereda sai da ficha da seção 9 ou é meta
   proposta com a conta à mostra.
4. **O conteúdo das folhas é do aluno.** Pode enxugar para caber no slide; não mude o
   sentido. Se achar erro de ITIL, aponte e pergunte antes de reescrever.
5. **Nada de CDN.** Fontes em base64 e three.js local: a sala pode não ter internet.
6. **Sempre verificar no navegador medindo** (seção 7) antes de dizer que está pronto.
   "Renderizou" não é prova.

---

## 6. Decisões de desenho que parecem arbitrárias mas não são

**Marca.** Barro `#B4633C`, Areia `#E8DCC8`, Branco quente `#F7F2E9`, Verde Vereda
`#3F5B48`, Carvão `#2A2521`, Dourado `#D8A34A`. Neutros dominam, verde é acento,
**dourado só na peça acesa**. O Barro puro dá 3,93:1 sobre o creme e REPROVA para texto
pequeno: em texto use `--barro-campo` `#8C4A28` (6,03:1).

**Campo de cor.** O texto e as caixas NUNCA atravessam a parada de cor (58 % / 62 %): do
outro lado mora o objeto 3D. Largura é amarrada em **% do `.dentro`** (ex.: `.slm > .folha
{ max-width: 59% }` no branco, `55%` no verde/barro), testado de 1024 a 1920.

**Rodapé fixo** (`#estado`, "bloco N / 15 · objeto: …") ocupa o pé da tela. Conteúdo não
pode ficar embaixo dele. O bloco tem `padding-bottom` para isso, mas conteúdo demais
ainda invade — ver seção 7.

**Tipografia (Fraunces + Work Sans, subset LATIN, variáveis 300–700):**
- As fontes embutidas eram o subset **VIETNAMITA** (o primeiro `@font-face` da resposta do
  Google Fonts; o latin é o ÚLTIMO). Tinha só A, Á, Ã: o resto caía em Georgia. Se
  reembutir fonte, confira medindo largura de glifo contra o fallback —
  `document.fonts.check` mente.
- `letter-spacing: 0` nos h1/h2 (medido em canvas: -0.045em dava 12 pares de letras com
  tinta sobreposta; a Fraunces opsz 144 já vem apertada). `word-spacing: 0.1em`.
- `font-optical-sizing: auto` declarado (o opsz padrão do arquivo é 9, o de texto).

**Revelação letra a letra** (`mascarar()` / `revelarLetras()`): cada letra num
`<span class="mask"><span class="mask__i">`. Tem de ser **span, nunca `<i>`** — `<i>` é
itálico no navegador e, sem Fraunces itálica, vira oblíquo SINTÉTICO (entortava o N e
o Q). `font-style: normal` na regra por garantia. Janela de recorte
`padding: .16em .06em .17em` com margem negativa igual (a cedilha de PEÇA desce 0,199em);
`translateY(140%)` acompanha essa janela.

**Objeto 3D** (`objeto.js`): o morph usa amortecimento 0.10 como ÚNICA curva; giro em
loop sem easing. O "fantasma" do estilhaço é uma janela que abre (3.3–3.7) e fecha
(3.85–4.0) junto com a geometria.

**Hero** (`luz.js`, bloco 0): luminária apagada; o ponteiro injeta luz num fluido
(Stable Fluids: splat → advecção → divergência → pressão Jacobi 20× → gradiente →
advecção da luz → revelação) que troca o quadro apagado pelo aceso. Medidor
**medido × meta 80 %** conta só células da grade 96×54 onde a peça existe (máscara lida
da imagem acesa); o trajeto do ponteiro é interpolado. Na meta, a peça acende inteira
(`uTudo`) e fica. Parâmetros de fluido medidos: `suavidadeBorda 0.035`,
`larguraBorda 0.30`, `tamanhoRevelacao 5.4`, dt real com teto 1/30 s, dissipação por
segundo. Sem WebGL: `.sem-luz` mostra a imagem acesa em CSS.

**Preload** (`#pre`): a peça "imprimindo" de baixo para cima enquanto carregam fontes,
objeto 3D, vídeo e as imagens do hero. Trava de 6,5 s; também sai por CSS aos 9 s se o JS
morrer. A entrada do primeiro slide fica NA FILA (`animarBloco` / `soltarFila`) até a tela
sair.

**Navegação:** a tecla mede onde a tela está (`indiceVisivel()`), nunca pergunta a uma
variável. `scrollTo` no contêiner `#deck` (não `scrollIntoView`), snap solto durante a
viagem e devolvido no `scrollend`. `e.repeat` ignorado. Guarda do IntersectionObserver
é `intersectionRatio < 0.5` (com `isIntersecting` o bloco que sai ficava com a última
palavra e o vídeo do fim tocava por cima do slide anterior).

---

## 7. Como verificar (cole no console da página)

**A aba do navegador precisa estar VISÍVEL.** Em aba de fundo, rAF, IntersectionObserver
e transições CSS congelam e todo teste dá falso negativo.

**Layout** — rode em 1024×768, 1280×720, 1366×768 e 1920×1080. Os três números têm de
ser zero/vazios:

```js
(async () => {
  await document.fonts.ready;
  const b = [...document.querySelectorAll('.bloco')], d = document.getElementById('deck');
  document.querySelectorAll('.surge').forEach(e => e.classList.add('ativo'));
  document.querySelectorAll('h1,h2,.eyebrow .num').forEach(e => e.classList.add('revelou'));
  const alto = [], rodape = [], fora = [];
  for (let i = 0; i < b.length; i++) {
    d.scrollTo({ top: b[i].offsetTop, behavior: 'instant' });
    // 250 ms: com menos, a rolagem ainda não assentou e o teste acusa invasão falsa
    await new Promise(r => setTimeout(r, 250));
    // o bloco CRESCE com o conteúdo: medir contra a tela, não scrollHeight do bloco
    if (b[i].offsetHeight > innerHeight + 2) alto.push(i);
    const topo = document.getElementById('estado').getBoundingClientRect().top;
    let fundo = 0;
    b[i].querySelectorAll('.dentro *').forEach(e => { const r = e.getBoundingClientRect(); if (r.height) fundo = Math.max(fundo, r.bottom); });
    // folga mínima de 8 px: a sombra das caixas (4-6 px) não entra no getBoundingClientRect
    if (fundo > topo - 8) rodape.push([i, Math.round(fundo - topo)]);
    const campo = b[i].classList.contains('bloco--branco') ? .62 : (/bloco--(verde|barro)/.test(b[i].className) ? .58 : null);
    if (campo) b[i].querySelectorAll('.caixa,.kpis,.fluxo,h2,p,li,td').forEach(e => {
      if (e.getBoundingClientRect().right > b[i].clientWidth * campo + 2) fora.push(i);
    });
  }
  console.log({ maisAltoQueATela: alto, embaixoDoRodape: rodape, foraDoCampo: [...new Set(fora)] });
})();
```

**Extensão de texto** se mede com `Range` sobre os NÓS DE TEXTO. `getBoundingClientRect`
de parágrafo devolve a largura do contêiner, não das letras.

**Hero:** `__luz.diagnostico()` → `{carregadas: 2, totalPeca: 553, medido, cumprido}`.
Prova de que desenha: `__luz.renderizarAgora(60)` → `acesos` > 0 (pixels lidos da GPU).
Gesto simulado: `__luz.passarMao([[x, y], ...])` em coordenadas de tela.

**Objeto 3D:** `__objeto.avancar(80)` roda quadros na hora; `__objeto.amostrar()` lê pixels.

**Navegação:** `__nav.onde()` devolve o bloco visível; `__nav.ir(i)`.

---

## 8. Pendências e ideias (nada disso foi pedido ainda)

- O kerning some com a máscara letra a letra (~8 px na capa, quase todo em `F|A`). Só
  volta mascarando por LINHA — é refatoração.
- As fontes pesam ~118 KB; dá para instanciar a Fraunces em `wght 400..700`.
- O `∞` do bloco final cai no Georgia de propósito (não existe no subset latin).
- A frequência "mensal" da revisão de SLM e a "linha de base do primeiro mês" são
  decisões do plano, não dados medidos (os céticos marcaram, está declarado no texto).

---

## 9. Ficha de fatos da vereda (única fonte de números)

- Dono sozinho, pessoa física (CPF). Palmas-TO. Instagram `@vereda.cerrado`; site
  `veredacerrado.com` (Netlify + Supabase + Resend).
- Portfólio: luminárias (a "Vereda", cogumelo E14), vasos, enfeites, lembranças; cor,
  tamanho e nome personalizáveis; "cinco modelos e o que o cliente inventar".
- Máquina: Bambu Lab P2S + AMS 2 Pro. Fatiador Bambu Studio. Modelagem Blender.
  PLA Matte (R$ 80/kg); PETG em peça técnica.
- Custos da calculadora: margem 120 %, P2S 150 W, energia R$ 0,95/kWh, desgaste R$ 1,20/h.
- Cúpula medida: 179,59 g e **11 h 41 min** de impressão; custo **R$ 30,05**; preço
  R$ 66 (R$ 70 com a taxa do Mercado Pago de **4,99 %**; R$ 119 com acabamento e
  embalagem).
- Falha de impressão de iniciante: 15 a 25 % (pesquisa do dono).
- Pagamento: Mercado Pago Checkout Pro (Pix e cartão). Frete: Melhor Envio (Brasil) +
  Palmas com retirada ou motoboy.
- Lei: Decreto 7.962/2013 (prazo de entrega informado; resposta a reclamação em até
  **5 dias**); CDC art. 49 (arrependimento em **7 dias**).
- Decisão de IA já apresentada: **adotar limitada**, só no Desenho, para ideias e prévia;
  cada modelo revisado e aprovado por uma pessoa antes da máquina; fora da Transição e da
  Operação.
