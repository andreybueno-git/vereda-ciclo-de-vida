/* =====================================================================
   O OBJETO
   Um só objeto 3D no centro da tela, do começo ao fim, que MORFA entre
   os cinco estados do ciclo de vida do serviço. Ele não ilustra as
   etapas: ele É as etapas.

     0  ESTRATÉGIA  nuvem de pontos à deriva. A ideia antes da matéria.
     1  DESENHO     os pontos assentam e o objeto se abre em FATIAS
                    separadas: é a tela do fatiador, o modelo virando
                    caminho de máquina.
     2  TRANSIÇÃO   as fatias se juntam, mas só a PRIMEIRA CAMADA é
                    sólida. O resto ainda é fantasma. É o protótipo.
     3  OPERAÇÃO    o sólido sobe do plano de corte, camada a camada,
                    girando. É a produção.
     4  MELHORIA    estilhaça, o perfil MUDA, e remonta OUTRA peça.
                    A avaliação do cliente virou o modelo seguinte.

   O corte de altura é um plano de recorte de verdade (clipping plane),
   não uma máscara desenhada por cima: por isso a borda do que já foi
   impresso acompanha a silhueta em qualquer ângulo.
   ===================================================================== */

window.iniciarObjeto = function (opcoes) {
  var tela = opcoes.canvas;
  if (typeof THREE === "undefined") return null;

  // --- os dois perfis: a peça de hoje e a peça que a avaliação pede ---
  var PERFIL_A = [[0,.30],[.08,.40],[.20,.36],[.34,.26],[.46,.24],[.60,.34],[.74,.48],[.88,.56],[.96,.55],[1,.50]];
  var PERFIL_B = [[0,.24],[.10,.30],[.24,.44],[.38,.40],[.52,.28],[.66,.30],[.80,.46],[.90,.58],[.97,.60],[1,.52]];

  function raio(perfil, t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 0; i < perfil.length - 1; i++) {
      var a = perfil[i], b = perfil[i + 1];
      if (t >= a[0] && t <= b[0]) {
        var f = (t - a[0]) / (b[0] - a[0] || 1);
        var s = (1 - Math.cos(f * Math.PI)) / 2;   // cosseno: silhueta sem bico
        return a[1] + (b[1] - a[1]) * s;
      }
    }
    return perfil[perfil.length - 1][1];
  }

  var ANEIS = 132, VOLTA = 76, ALTURA = 3.4, RAIO = 2.2, TORCAO = 1.15;
  var N = ANEIS * VOLTA;

  // --- cena ----------------------------------------------------------
  var renderizador;
  try {
    renderizador = new THREE.WebGLRenderer({
      canvas: tela, antialias: true, alpha: true,
      // Sem isto, qualquer engasgo do laço faz o palco PISCAR em branco.
      // Num projetor isso é inaceitável.
      preserveDrawingBuffer: true
    });
  } catch (e) { return null; }
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderizador.localClippingEnabled = true;

  var cena = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.35, 9.2);

  var grupo = new THREE.Group();
  cena.add(grupo);

  // --- geometria construída à mão ------------------------------------
  // LatheGeometry não serve: preciso mexer em CADA anel separadamente
  // para explodir as fatias, e preciso saber a que anel cada vértice
  // pertence. Então o grid é construído aqui.
  var pos = new Float32Array(N * 3);
  var base = new Float32Array(N * 3);   // posição de repouso
  var anelDe = new Float32Array(N);     // 0..1 altura do anel
  var angDe = new Float32Array(N);
  var ruido = new Float32Array(N * 3);

  for (var a = 0; a < ANEIS; a++) {
    var t = a / (ANEIS - 1);
    for (var v = 0; v < VOLTA; v++) {
      var i = a * VOLTA + v;
      anelDe[i] = t;
      angDe[i] = (v / VOLTA) * Math.PI * 2 + t * TORCAO;
      ruido[i * 3]     = (Math.random() - 0.5);
      ruido[i * 3 + 1] = (Math.random() - 0.5);
      ruido[i * 3 + 2] = (Math.random() - 0.5);
    }
  }

  var indices = [];
  for (var a2 = 0; a2 < ANEIS - 1; a2++) {
    for (var v2 = 0; v2 < VOLTA; v2++) {
      var i0 = a2 * VOLTA + v2;
      var i1 = a2 * VOLTA + (v2 + 1) % VOLTA;
      var i2 = (a2 + 1) * VOLTA + v2;
      var i3 = (a2 + 1) * VOLTA + (v2 + 1) % VOLTA;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(indices);

  var geoPontos = new THREE.BufferGeometry();
  geoPontos.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  // --- materiais ------------------------------------------------------
  var VERDE = new THREE.Color("#3F5B48");
  var OURO  = new THREE.Color("#D8A34A");
  var BARRO = new THREE.Color("#B4633C");

  var planoCorte = new THREE.Plane(new THREE.Vector3(0, -1, 0), ALTURA);

  var matSolido = new THREE.MeshStandardMaterial({
    color: VERDE.clone(), roughness: 0.62, metalness: 0.04,
    flatShading: true, side: THREE.DoubleSide,
    transparent: true, opacity: 0,
    clippingPlanes: [planoCorte]
  });
  var solido = new THREE.Mesh(geo, matSolido);
  grupo.add(solido);

  var matArame = new THREE.MeshBasicMaterial({
    color: VERDE.clone(), wireframe: true, transparent: true, opacity: 0
  });
  var arame = new THREE.Mesh(geo, matArame);
  grupo.add(arame);

  var matPontos = new THREE.PointsMaterial({
    color: BARRO.clone(), size: 0.046, transparent: true, opacity: 1,
    sizeAttenuation: true
  });
  var pontos = new THREE.Points(geoPontos, matPontos);
  grupo.add(pontos);

  cena.add(new THREE.AmbientLight(0xF7F2E9, 1.15));
  var chave = new THREE.DirectionalLight(0xFFF3DC, 2.2);
  chave.position.set(-4, 6, 5);
  cena.add(chave);
  var contra = new THREE.DirectionalLight(0xD8A34A, 0.85);
  contra.position.set(5, -2, 2);
  cena.add(contra);

  // --- estado ---------------------------------------------------------
  var alvo = 0, s = 0;          // 0..4, contínuo
  var relogio = new THREE.Clock();
  var vivo = true, quadros = 0;

  function faixa(x, a, b) { return Math.max(0, Math.min(1, (x - a) / (b - a))); }
  function suavizar(x) { return x * x * (3 - 2 * x); }

  function atualizarGeometria(tempo) {
    // Quanto cada efeito vale no estado atual. Cada um nasce e morre
    // numa janela, e é a soma disso que produz a metamorfose.
    var deriva   = 1 - faixa(s, 0, 1);              // 0 estratégia
    var explode  = suavizar(faixa(s, 0.35, 1)) * (1 - suavizar(faixa(s, 1, 1.75)));
    var estilhaco= suavizar(faixa(s, 3.25, 3.75)) * (1 - suavizar(faixa(s, 3.85, 4)));
    var trocaPerfil = suavizar(faixa(s, 3.4, 4));   // vira a OUTRA peça

    for (var i = 0; i < N; i++) {
      var t = anelDe[i], ang = angDe[i];
      var rA = raio(PERFIL_A, t), rB = raio(PERFIL_B, t);
      var r = (rA + (rB - rA) * trocaPerfil) * RAIO;
      var y = (t - 0.5) * ALTURA;

      // as fatias se afastam: é a tela do fatiador
      if (explode > 0) {
        var faixaFatia = Math.floor(t * 14) / 14 - 0.5;
        y += faixaFatia * ALTURA * 0.85 * explode;
      }
      // a ideia à deriva, antes de existir matéria
      var d = deriva * 1.5 + estilhaco * 2.2;
      var ondula = deriva * Math.sin(tempo * 0.9 + t * 9.0) * 0.18;

      var j = i * 3;
      pos[j]     = Math.cos(ang) * r + ruido[j] * d + ondula;
      pos[j + 1] = y + ruido[j + 1] * d;
      pos[j + 2] = Math.sin(ang) * r + ruido[j + 2] * d;
    }
    geo.attributes.position.needsUpdate = true;
    geoPontos.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  }

  function dimensionar() {
    var l = tela.clientWidth, a = tela.clientHeight;
    if (!l || !a) return;
    renderizador.setSize(l, a, false);
    camera.aspect = l / a;
    // Em tela estreita o objeto recua e sobe; em tela larga ele ocupa a
    // direita e deixa a esquerda para a tipografia gigante.
    var estreito = l < 950;
    camera.position.z = estreito ? 11.5 : 9.2;
    grupo.position.x = estreito ? 0 : 1.5;
    grupo.position.y = estreito ? 0.3 : 0;
    camera.updateProjectionMatrix();
  }

  function passo() {
    if (!vivo) return;
    requestAnimationFrame(passo);
    if (document.visibilityState !== "visible") return;
    dimensionar();
    var tempo = relogio.getElapsedTime();

    // Amortecimento em 0.10: é a faixa que a ficha de motion do time
    // fixa (0.08-0.12) para o morph não tremer. Abaixo disso ele arrasta,
    // acima ele pisca entre estados. E é a ÚNICA curva do morph: empilhar
    // um easing por cima somaria duas curvas, que é o erro clássico.
    s += (alvo - s) * 0.10;
    atualizarGeometria(tempo);

    // --- o que se vê em cada estado ---
    var vPontos = 1 - suavizar(faixa(s, 0.6, 1.5)) * 0.72;
    var vArame  = suavizar(faixa(s, 0.3, 1.1)) * (1 - suavizar(faixa(s, 2.4, 3.1))) * 0.55
                + suavizar(faixa(s, 3.3, 3.8)) * 0.5;
    var vSolido = suavizar(faixa(s, 1.5, 2.3));

    matPontos.opacity = Math.max(0.05, vPontos);
    matArame.opacity = vArame;
    matSolido.opacity = vSolido * (1 - suavizar(faixa(s, 3.3, 3.7)) * 0.85);

    // --- o plano de corte: a impressão subindo ---
    // Em TRANSIÇÃO só a primeira camada existe; em OPERAÇÃO ele sobe.
    var impresso = 0.06 + 0.94 * suavizar(faixa(s, 2.15, 3.15));
    planoCorte.constant = -ALTURA / 2 + impresso * ALTURA;

    // --- o ouro só na peça pronta, regra do kit da marca ---
    var aceso = suavizar(faixa(s, 2.95, 3.3)) * (1 - suavizar(faixa(s, 3.35, 3.7)));
    matSolido.color.copy(VERDE).lerp(OURO, aceso * 0.72);
    matSolido.emissive = matSolido.emissive || new THREE.Color();
    matSolido.emissive.copy(OURO).multiplyScalar(aceso * 0.30);

    // --- giro: lento sempre, e um empurrão na operação ---
    grupo.rotation.y = tempo * 0.16 + s * 0.42;
    grupo.rotation.z = Math.sin(tempo * 0.21) * 0.035;

    renderizador.render(cena, camera);
    quadros++;
  }

  dimensionar();
  atualizarGeometria(0);
  requestAnimationFrame(passo);
  window.addEventListener("resize", dimensionar);

  return {
    definirEstado: function (x) { alvo = Math.max(0, Math.min(4, x)); },
    parar: function () { vivo = false; },
    // Diagnóstico: roda N quadros AGORA, porque requestAnimationFrame
    // não dispara em aba de segundo plano e sem isto não dá para provar
    // que a metamorfose acontece.
    avancar: function (n) {
      for (var i = 0; i < (n || 1); i++) {
        s += (alvo - s) * 0.055;
        atualizarGeometria(i * 0.016);
        var vS = suavizar(faixa(s, 1.5, 2.3));
        matSolido.opacity = vS;
        matPontos.opacity = Math.max(0.05, 1 - suavizar(faixa(s, 0.6, 1.5)) * 0.72);
        matArame.opacity = suavizar(faixa(s, 0.3, 1.1)) * (1 - suavizar(faixa(s, 2.4, 3.1))) * 0.55;
        planoCorte.constant = -ALTURA / 2 + (0.06 + 0.94 * suavizar(faixa(s, 2.15, 3.15))) * ALTURA;
        renderizador.render(cena, camera);
      }
      return { s: +s.toFixed(2), solido: +matSolido.opacity.toFixed(2),
               pontos: +matPontos.opacity.toFixed(2), arame: +matArame.opacity.toFixed(2) };
    },
    amostrar: function () {
      var gl = renderizador.getContext();
      var l = gl.drawingBufferWidth, a = gl.drawingBufferHeight;
      var px = new Uint8Array(l * a * 4);
      gl.readPixels(0, 0, l, a, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var pintados = 0, niveis = {};
      for (var i = 0; i < px.length; i += 16) {
        if (px[i + 3] > 10) { pintados++; niveis[(px[i] + px[i+1] + px[i+2]) >> 4] = 1; }
      }
      return { pintados: pintados, niveis: Object.keys(niveis).length };
    },
    diagnostico: function () { return { quadros: quadros, s: +s.toFixed(2), alvo: alvo }; }
  };
};
