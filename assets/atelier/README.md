# Atelier 3D — notebook e impressora

Modelos 3D reais, criados no Higgsfield 3D Jutsu / Blender 5.2 para a apresentação local Vereda. A impressora usa a Bambu Lab P2S com AMS 2 Pro como referência visual; é uma modelagem autoral para narrativa, não CAD de fabricação. O notebook tem desenho contemporâneo genérico em alumínio grafite.

Projeto: [Vereda Atelier](https://higgsfield.ai/3d-jutsu/36a75bfe-6671-48b3-8fa1-da06ea76be27), revisão **2**. Nenhum arquivo da apresentação foi alterado por esta entrega.

## Arquivos

| Arquivo | Uso | Tamanho | Malhas | Triângulos |
|---|---|---:|---:|---:|
| `notebook.glb` | Notebook isolado, raiz na origem | 406.480 B | 18 | 19.310 |
| `printer.glb` | Impressora e AMS, raiz na origem | 925.296 B | 69 | 47.578 |
| `atelier.glb` | Ambos na composição original, sem cenário | 1.320.348 B | 87 | 66.888 |
| `atelier-source.glb` | Exportação original do Higgsfield, incluindo câmera/luzes/chão de inspeção | 1.325.540 B | — | — |
| `atelier.blend` | Cena editável, materiais, modificadores, pivôs e iluminação | 1.879.090 B | — | — |
| `atelier-preview.png` | Render de verificação visual | — | — | — |
| `printer-interior.png` | Inspeção de mesa/cabeçote com porta aberta temporariamente | — | — | — |
| `manifest.json` | Dimensões, nomes, coordenadas e hashes | — | — | — |
| `validacao.json` | Resultado da leitura com o GLTFLoader local Three **r128** | — | — | — |
| `atelier-gerador.py` | Fonte de construção da cena Blender | — | — | — |
| `atelier-extrair-glb.py` | Extração dos grupos e compatibilidade PBR r128 | — | — | — |

Os três arquivos de execução têm materiais PBR básicos, sem Draco, sem texturas externas, sem dependência de rede e sem câmera, luz ou chão. As malhas e seus nomes foram preservados da exportação real do Higgsfield. A extração removeu somente o conjunto de inspeção e dados não utilizados, centralizou as raízes nos arquivos isolados e incorporou a intensidade emissiva ao material básico, compatível com r128.

## Coordenadas

Metros; **+Y para cima, +Z para a frente; chão em Y=0**. `notebook.glb` tem raiz `Notebook`; `printer.glb` tem raiz `Printer_P2S`. No arquivo conjunto as raízes estão em `[-0.365,0,0.045]` e `[0.25,0,-0.045]`; zere apenas essas posições para recompor os objetos.

Bounding boxes reais dos arquivos isolados:

- Notebook aberto: **0,3436 × 0,24555 × 0,26548 m** em X/Y/Z.
- Impressora com AMS, tela, puxador e tubo: **0,41272 × 0,68200 × 0,46859 m**. O gabinete nominal tem 0,392 m de largura e 0,406 m de profundidade; os acessórios ultrapassam esse volume.

## Peças para a narrativa

Todas as posições abaixo são locais ao pai indicado, antes da escala aplicada pelo renderer.

| Nome exato | Pai | Posição de repouso X/Y/Z | Uso |
|---|---|---|---|
| `Notebook_Lid` | `Notebook` | `[0, 0.025, -0.099]` | Dobradiça central traseira. `rotation.x=-0.20943951` aberta; `+1.57079633` fechada. |
| `Notebook_Screen` | `Notebook_Lid` | `[0, 0.115, 0.0041]` | Plano independente 0,311 × 0,194 m, origem no centro, normal +Z e UV 0..1. |
| `Printer_Door` | `Printer_P2S` | `[-0.16, 0.235, 0.211]` | Pivô na dobradiça esquerda; abre para fora com `rotation.y≈-1.92`. |
| `Printer_Bed` | `Printer_P2S` | `[0, 0.122, 0]` | Movimento vertical em Y. Superfície de impressão fica 0,011 m acima da origem deste grupo. |
| `Printer_Gantry` | `Printer_P2S` | `[0, 0.389, 0]` | Eixo horizontal completo; pode transladar em Z. |
| `Printer_Nozzle` | `Printer_Gantry` | `[0, -0.014, 0.031]` | Cabeçote; transladar em X para varrer a mesa. |
| `Printer_NozzleTip` | `Printer_Nozzle` | Geometria com ponta em Y local −0,05 | Contato de impressão. Em repouso a ponta fica em Y=0,325 na raiz da impressora. |
| `AMS` | `Printer_P2S` | `[0, 0.466, -0.01]` | Conjunto completo sobre a carcaça. |
| `AMS_Lid` | `AMS` | `[0, 0.089, -0.135]` | Dobradiça traseira. Abrir com `rotation.x` negativa, por exemplo −1,25. |
| `AMS_Spool_01` … `AMS_Spool_04` | `AMS` | Quatro posições fixas | Cada bobina pode girar em seu eixo local X. |

`Printer_ControlScreen` também é um plano separado. `Printer_DoorGlass`, `Printer_TopGlass` e `AMS_LidGlass` compartilham material `Smoked glazing`; use `depthWrite=false` no renderer se a ordenação da transparência ocultar o interior. Há detalhes de teclado agregados em malhas, em vez de uma draw call por tecla.

### Tela do notebook

Troque o material de `Notebook_Screen` por um material com CanvasTexture. Para manter a orientação UV exportada pelo glTF, use `texture.flipY = false`. O material original se chama `Notebook_Display`; não há imagem estática embutida que precise ser removida.

```js
const lid = model.getObjectByName('Notebook_Lid');
const screen = model.getObjectByName('Notebook_Screen');
const texture = new THREE.CanvasTexture(canvas);
texture.flipY = false;
texture.encoding = THREE.sRGBEncoding; // Three r128
screen.material = new THREE.MeshBasicMaterial({ map: texture });
lid.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, -0.20943951, abertura);
```

### Construção dentro da impressora

A superfície de repouso está em **Y=0,133**, área útil referencial de **0,256 × 0,256 m**. Um modelo de 0,18 m de altura cabe entre a mesa de repouso e a ponta do nozzle. Para uma narrativa de impressão, pode-se colocar a peça como filha de `Printer_Bed` em `[0,0.011,0]`, começar a mesa próxima ao cabeçote e abaixá-la conforme as camadas aparecem. Preserve os valores de repouso ao reverter o scroll. A cena GLB não contém animações predefinidas: o progresso deve ser dirigido pelo renderer.

## Verificação e fontes

Os três GLBs passaram pelo **GLTFLoader r128 presente na apresentação**, sem erro de parsing; foram conferidos número de malhas/triângulos, coordenadas finitas, bounding boxes, pivôs, UVs e material da tela. O render de câmera foi inspecionado para proporções, contato com o chão e separação das peças. O desempenho final depende do renderer, luzes e número de objetos simultâneos.

Referências visuais e dimensionais:

- [Apresentação oficial da P2S](https://blog.bambulab.com/the-icon-redefined-meet-the-p2s-a-completely-reengineered-version-of-the-ultra-productive-p1-series/): carcaça, porta, tela superior e AMS.
- [Manual oficial P2S](https://csm.bblcdn.com/hub/9425242c00344b0e801b6179f9a243aa.pdf): organização dos componentes e volume de construção.
- [AMS 2 Pro — loja oficial](https://us.store.bambulab.com/products/ams-2-pro?from=home_web): proporções do alimentador e quatro bobinas.

A imagem oficial foi consultada como referência; não foi incorporada aos materiais ou aos GLBs. Câmera, geometria, iluminação e materiais desta entrega foram construídos no projeto acima.
