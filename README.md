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
