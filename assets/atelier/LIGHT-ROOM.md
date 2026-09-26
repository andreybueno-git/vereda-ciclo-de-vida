# Ambiente do app Luz

`../../light-room.js` cria um cenário original com geometria Three.js: console de madeira, parede musgo, janela em arco, dois livros, pratinho de barro e planta discreta. As texturas são desenhadas localmente em canvas. Não há rede, modelos adicionais, imagens geradas ou dependências novas.

## API e integração

```js
const lightRoom = VeredaLightRoom.create(THREE);
scene.add(lightRoom.group);
// Atualizar junto do estado do app:
lightRoom.group.visible = active === 'luz';
lightRoom.setLight(active === 'luz' && state.lit ? 1 : 0);
// A luminária permanece independente, na origem:
lamp.setLight(state.lit ? 1 : 0);
// Descarte definitivo:
lightRoom.dispose();
```

O módulo não altera a câmera, o renderer nem a luminária. `setLight` aceita valores de 0 a 1, sem animação ou requestAnimationFrame interno. Retorna `{group, setLight, dispose, info}`; o manifesto também fica em `group.userData.veredaRoom`.

## Coordenadas e enquadramento

- Luminária: origem XYZ **0, 0, 0**, altura **2.72**, sem transformação necessária.
- Tampo: **4.35 × 1.98**, superfície em **Y −0.005**. Luminária central, apoiada no tampo.
- Parede: **Z −1.235**, musgo; janela com centro horizontal **X −1.63** e moldura até **Y 3.237**.
- Livros: centro aproximado **1.37, 0.10, 0.14**; vaso em **−1.48, 0.001, 0.25**, folhagem até **Y 1.297**.
- A câmera atual (`yaw .55`, `pitch .15`, `distance 6`, alvo `0, 1.25, 0`, FOV 34°) enquadra a peça e os acessórios. A frente inferior do console fica cortada como numa fotografia de interior; o topo do arco toca o enquadramento.
- Para um pouco mais de espaço no app Luz: `yaw .32`, `pitch .15`, `distance 6.7`. É uma sugestão de integração; o módulo não move a câmera.

Materiais sRGB convertidos para linear, texturas canvas sRGB. O cenário acrescenta uma luz pontual quente, reflexo suave no tampo e na parede e sombra de contato. Funciona com shadow maps desabilitados; as malhas também declaram cast/receiveShadow para permitir sombras reais no renderer do host.

## Verificação

`node --check` passou. Instanciado com Three r128: **45 meshes / 3.647 triângulos**, todos os vértices finitos. Verificados bounds e projeção dos acessórios usando a câmera atual, transição da luz de 0 a 2.15 e descarte de geometrias, materiais e texturas. A revisão visual integrada fica a cargo do renderer do app.
