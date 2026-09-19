# Máquina de fazer coisas

**Ciclo de vida do serviço (ITIL) aplicado à vereda**
Gerenciamento de Serviços de TI · apresentação em 19/09/2026

**No ar:** https://andreybueno-git.github.io/vereda-ciclo-de-vida/

---

## A ideia

O deck tem **um objeto 3D só**, do começo ao fim, que **morfa** entre as
cinco etapas do ciclo. Ele não ilustra o processo: ele é o processo.

| Etapa | O que o objeto vira |
|---|---|
| Estratégia | nuvem de pontos à deriva: a ideia antes da matéria |
| Desenho | o objeto se abre em fatias separadas: a tela do fatiador |
| Transição | as fatias se juntam, mas só a primeira camada é sólida |
| Operação | o sólido sobe do plano de corte, girando: a produção |
| Melhoria contínua | estilhaça, o perfil muda, e remonta **outra peça** |

A última é o ponto da apresentação: melhoria contínua não encerra o ciclo,
devolve ele para o começo. Por isso o objeto não para numa forma final.

## Como abrir

Precisa de HTTP por causa do WebGL:

```bash
python3 -m http.server 8811
```

Depois `http://localhost:8811`. No VS Code, **F5** ou *Open with Live Server*.

Navegar: setas `←` `→` (ou `↑` `↓`), barra de espaço, `Home` e `End`.

## O motion das letras

Os títulos não aparecem em bloco: **cada letra sobe de trás de uma régua
invisível**, em cascata. É o gesto que a ficha de motion do time chama de
line-mask, e é o único que aguenta tipografia deste tamanho — um fade em
bloco numa palavra de 200px parece que a página demorou a carregar, não
que ela entrou.

Dois detalhes que custaram atenção:

- **A palavra inteira vira um bloco que não quebra.** Cortando por letra
  sem isso, a linha quebraria no meio de "MÁQUINA".
- **O recorte precisa de folga vertical.** Com `line-height: 0.86` e caixa
  alta acentuada, o Á e o Ç encostavam na borda e ficavam decapitados. O
  padding abre a caixa de recorte e a margem negativa devolve o espaço ao
  layout, então nada muda de lugar. Medido: 0 letras cortadas, mesma
  quantidade de quebras de linha que antes.

Valores: curva `cubic-bezier(0.25, 1, 0.5, 1)` e duração 1,2s, os tokens
que a ficha de produção usa para tudo que entra. Passo de 0,028s por
letra — os 0,1s da ficha só servem a palavra solta; numa manchete viram
quatro segundos.

## A peça acendendo

O último bloco troca o objeto abstrato pela **peça de verdade**: a
luminária da vereda, no escuro, acendendo. É o único lugar do deck onde a
matéria aparece sem metáfora, e é o fim da fala.

O vídeo foi renderizado no Blender, em `render_acende.py`, e vale
registrar como:

- **Ela é construída camada a camada, não torneada.** 325 anéis empilhados
  a 0,008 de altura, cada um saltando 0,006 para fora e voltando. Um lathe
  liso daria um vaso de cerâmica; a serrilha é o que faz o olho ler
  "impresso em 3D".
- **O perfil é o mesmo que o objeto do deck usa.** A peça que morfa nos
  sete blocos e a peça que acende no oitavo são a mesma silhueta.
- **A parede é fina de propósito** (Solidify 0,018) e o PLA tem
  `Transmission Weight 0,34`. É isso que deixa a luz atravessar entre as
  camadas, que é o que a peça faz na mesa.
- **A lâmpada acende como filamento**, não como interruptor: demora a
  pegar, dá um salto, recua e assenta (chaves em 0 → 12 → 6 → 90 → 165).

Regenerar:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P render_acende.py
ffmpeg -y -framerate 24 -i assets/quadros/a%04d.png -c:v libx264 \
  -preset veryslow -crf 26 -pix_fmt yuv420p -movflags +faststart \
  assets/peca-acende.mp4
```

Medido no navegador: o brilho médio do quadro sobe de 6,1 para 23,7 e o
pico de 71 para 246 entre o começo e o fim. A peça acende de fato, não é
impressão de quem já sabe o que devia acontecer.

Uma armadilha: **o navegador pausa vídeo mudo em aba de segundo plano.**
Medido aqui, a peça congelava em 0,3 s. Quando a aba volta, o
acendimento recomeça do zero em vez de mostrar meio quadro.

## Decisões

- **Brutalismo com a paleta da marca.** Tipografia enorme cortada pela borda,
  campos de cor chapada com parada dura em 58%, sombra offset sem desfoque,
  zero raio. A cor acaba, não desbota.
- **O objeto sangra por fora do campo.** Cobrindo a tela inteira, ele sumia em
  três dos oito blocos e deixava de ser o assunto.
- **O dourado obedece o kit da marca:** só aparece na peça acesa, que aqui é o
  estado 3 do objeto e mais nada.
- **O corte da impressão é um plano de recorte de verdade**, não máscara
  desenhada por cima: a borda do que já foi impresso acompanha a silhueta em
  qualquer ângulo.
- **Nada externo.** Fontes embutidas em base64 e `three.min.js` local. Numa sala
  sem internet, o CDN deixaria o objeto de fora e a apresentação perderia o
  assunto.

## Medições

- Contraste: o Barro do kit (`#B4633C`) dá 3,93 sobre branco quente e reprova
  para texto de corpo. O campo de sangria usa `#8C4A28`, medido em 6,03. O Barro
  original continua nos acentos e rótulos.
- Amortecimento do morph em 0,10, a faixa que a ficha de motion do time fixa
  (0,08–0,12). Abaixo arrasta, acima pisca entre estados. É a única curva do
  morph: empilhar um easing por cima somaria duas curvas.
- Giro em loop sem easing. Curva num giro contínuo faz o objeto pulsar uma vez
  por volta, e num telão o olho pega.
