# Adesivos do notebook

Módulo: `../../notebook-stickers.js`. Cinco adesivos locais em CanvasTexture, sem serviços remotos nem dependências novas. Arte de sol, camadas, código e localização desenhada para esta apresentação. O quinto usa `../brand/simbolo-app.png`, o PNG oficial já documentado em `../brand/proveniencia.json`, sem redesenhar o símbolo.

## Integração

Carregar o módulo após `three.min.js` e antes de `atelier-scene.js`. No callback do GLB, após obter `Notebook`:

```js
const stickers = window.VeredaStickers.apply(notebookAsset);
// Opcional: aguardar PNG oficial e Manrope antes de capturar a cena.
await stickers.ready;
// Ao descartar o asset:
stickers.dispose();
```

`apply` é idempotente. Retorna `{meshes, placements, ready, dispose}`. O módulo mantém as coordenadas em metros locais, portanto o `scale=8.2` aplicado pelo renderer é herdado uma única vez. Os adesivos da tampa são filhos de `Notebook_Lid` e seguem a dobradiça.

## Posições verificadas

| Adesivo | Pai de referência | Centro XYZ (m) | Largura × altura (m) |
| --- | --- | --- | --- |
| Sol do Cerrado | Notebook | −0.119, 0.02386, 0.074 | 0.056 × 0.056 |
| Camada por camada | Notebook | 0.113, 0.02391, 0.062 | 0.062 × 0.028 |
| Código / ideia vira coisa | Notebook | 0.111, 0.02396, 0.096 | 0.064 × 0.023 |
| Feito em Palmas · TO | Notebook_Lid | −0.073, 0.0123, 0.00436 | 0.112 × 0.0077 |
| Vereda / símbolo oficial | Notebook_Lid | 0.078, 0.0123, 0.00437 | 0.062 × 0.0077 |

Validação numérica com o GLB real e Three r128: os três adesivos do apoio ficam em Z 0.043724–0.108613, fora do teclado (até 0.0395), da borda frontal (0.1125) e do trackpad (X ±0.060). Os adesivos da moldura ficam em Y 0.008282–0.016318 na tampa; a tela começa em Y 0.018 e a moldura começa em 0.007. Suas rotações discretas já estão incluídas nesses limites.

Materiais com recorte alfa, teste de profundidade, sem lançar sombras; textura sRGB, acabamento mate, decal levemente acima da superfície e polygon offset. A Manrope é redesenhada depois de carregada. Se o PNG oficial falhar, a etiqueta mantém apenas o nome Vereda. Nenhuma parte do teclado ou da interface recebe adesivos.

Verificado: `node --check`, cinco meshes, aplicação idempotente, remoção e descarte das texturas, geometria e materiais. A validação numérica não substitui a revisão visual na cena integrada.
