/* =====================================================================
   A PEÇA QUE VOCÊ ACENDE — o hero interativo
   vereda · Desenho do Serviço · Gerenciamento do Nível de Serviço

   O QUE ACONTECE AQUI
   A tela mostra a luminária apagada. O ponteiro injeta LUZ numa
   simulação de fluido rodando na GPU (Stable Fluids, Jos Stam): onde a
   luz fica densa, a peça acende; como a luz é carregada pela velocidade
   e vai dissipando, ela escorre e apaga sozinha.

   Ao mesmo tempo um medidor compara o MEDIDO com a META: quanto da peça
   já recebeu luz, contra 80 %. Quando o medido passa da meta, a peça
   acende inteira e fica acesa. É o SLM em uma frase: o serviço é uma
   promessa com número, e ela só vale se alguém medir.

   A física é a mesma da coruja do Prolog, que já foi provada
   renderizando: splat -> advecção da velocidade -> divergência ->
   pressão (Jacobi 20x) -> gradiente -> advecção da luz -> revelação.
   Sem passe de vorticidade (curlStrength 0 na referência: fluido liso é
   decisão, não defeito). As [ARMADILHAS] marcadas vieram de quadros
   comparados, não de teoria.
   ===================================================================== */

window.iniciarLuz = function (opcoes) {
  var tela = opcoes.canvas;
  var srcApagada = opcoes.apagada;
  var srcAcesa = opcoes.acesa;
  var aoMedir = opcoes.aoMedir || function () {};
  var aoCumprir = opcoes.aoCumprir || function () {};

  var CFG = {
    resSim: 256,
    resLuz: 512,
    dissipacaoVelocidade: 0.962,
    dissipacaoLuz: 0.9915,     // a luz seca um pouco mais rápido que a tinta
                               // da coruja: é luz, não pigmento
    iteracoesPressao: 20,      // 5 vaza volume, 60 não muda nada
    raioSplat: 0.00058,
    forcaSplat: 6200,
    tamanhoRevelacao: 5.4,
    // O par que decide o humor. 0.035 / 0.30 é o degradê medido na coruja:
    // a revelação começa com densidade 0,006 e completa em 0,062, dentro
    // da faixa que o fluido realmente produz.
    suavidadeBorda: 0.035,
    larguraBorda: 0.30,
    meta: 0.80,
  };

  // Caixa da luminária no quadro, medida no render (fração da imagem,
  // origem no canto superior esquerdo).
  var CAIXA = { x0: 0.537, x1: 0.771, y0: 0.178, y1: 0.830 };
  var ASP_IMG = 16 / 9;

  // ------------------------------------------------------------------
  // 1. CONTEXTO
  // ------------------------------------------------------------------
  // preserveDrawingBuffer: sem ele o buffer é limpo depois de cada
  // composição e qualquer engasgo do rAF faz o hero piscar.
  var atributos = { alpha: false, antialias: false, depth: false,
                    stencil: false, preserveDrawingBuffer: true };
  var gl = tela.getContext("webgl2", atributos);
  var webgl2 = !!gl;
  if (!gl) gl = tela.getContext("webgl", atributos) || tela.getContext("experimental-webgl", atributos);
  if (!gl) return null;

  var formatoMeio, filtro;
  if (webgl2) {
    gl.getExtension("EXT_color_buffer_float");
    var linear2 = gl.getExtension("OES_texture_float_linear");
    formatoMeio = { interno: gl.RGBA16F, formato: gl.RGBA, tipo: gl.HALF_FLOAT };
    filtro = linear2 ? gl.LINEAR : gl.NEAREST;
  } else {
    var meio = gl.getExtension("OES_texture_half_float");
    if (!meio) return null;
    var linear1 = gl.getExtension("OES_texture_half_float_linear");
    formatoMeio = { interno: gl.RGBA, formato: gl.RGBA, tipo: meio.HALF_FLOAT_OES };
    filtro = linear1 ? gl.LINEAR : gl.NEAREST;
  }
  // Sem filtragem linear a advecção fica em blocos: melhor desistir e
  // deixar o fallback em CSS do que entregar luz serrilhada.
  if (filtro !== gl.LINEAR) return null;

  // ------------------------------------------------------------------
  // 2. SHADERS  (array + join("\n"): numa string única, o "//" de um
  //    comentário come o resto do shader, inclusive o main)
  // ------------------------------------------------------------------
  function compilar(tipo, fonte) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function programa(fsFonte) {
    var vs = compilar(gl.VERTEX_SHADER, VERTICE);
    var fs = compilar(gl.FRAGMENT_SHADER, fsFonte);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("link:", gl.getProgramInfoLog(p));
      return null;
    }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var nome = gl.getActiveUniform(p, i).name;
      u[nome] = gl.getUniformLocation(p, nome);
    }
    return { p: p, u: u };
  }

  var VERTICE = [
    "precision highp float;",
    "attribute vec2 aPos;",
    "varying vec2 vUv; varying vec2 vE; varying vec2 vD; varying vec2 vC; varying vec2 vB;",
    "uniform vec2 uTexel;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  vE = vUv - vec2(uTexel.x, 0.0);",
    "  vD = vUv + vec2(uTexel.x, 0.0);",
    "  vC = vUv + vec2(0.0, uTexel.y);",
    "  vB = vUv - vec2(0.0, uTexel.y);",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var CABECA = [
    "precision highp float; precision highp sampler2D;",
    "varying vec2 vUv; varying vec2 vE; varying vec2 vD; varying vec2 vC; varying vec2 vB;"
  ].join("\n") + "\n";

  var COPIA = CABECA + [
    "uniform sampler2D uTex;",
    "void main() { gl_FragColor = texture2D(uTex, vUv); }"
  ].join("\n");

  var SPLAT = CABECA + [
    "uniform sampler2D uAlvo;",
    "uniform float uProporcao;",
    "uniform vec3 uCor;",
    "uniform vec2 uPonto;",
    "uniform float uRaio;",
    "void main() {",
    "  vec2 p = vUv - uPonto;",
    "  p.x *= uProporcao;",
    "  vec3 splat = exp(-dot(p, p) / uRaio) * uCor;",
    "  vec3 base = texture2D(uAlvo, vUv).xyz;",
    "  gl_FragColor = vec4(base + splat, 1.0);",
    "}"
  ].join("\n");

  // [ARMADILHA] dois texel sizes: a velocidade desloca na grade 256 e a
  // luz é amostrada na grade 512. Um só faz a luz andar na escala errada.
  var ADVECCAO = CABECA + [
    "uniform sampler2D uVelocidade;",
    "uniform sampler2D uFonte;",
    "uniform vec2 uTexelVel;",
    "uniform float uDt;",
    "uniform float uDissipacao;",
    "void main() {",
    "  vec2 coord = vUv - uDt * texture2D(uVelocidade, vUv).xy * uTexelVel;",
    "  gl_FragColor = uDissipacao * texture2D(uFonte, coord);",
    "  gl_FragColor.a = 1.0;",
    "}"
  ].join("\n");

  // [ARMADILHA] borda espelhada, senão o fluido vaza pelos cantos.
  var DIVERGENCIA = CABECA + [
    "uniform sampler2D uVelocidade;",
    "void main() {",
    "  float E = texture2D(uVelocidade, vE).x;",
    "  float D = texture2D(uVelocidade, vD).x;",
    "  float C = texture2D(uVelocidade, vC).y;",
    "  float B = texture2D(uVelocidade, vB).y;",
    "  vec2 centro = texture2D(uVelocidade, vUv).xy;",
    "  if (vE.x < 0.0) { E = -centro.x; }",
    "  if (vD.x > 1.0) { D = -centro.x; }",
    "  if (vC.y > 1.0) { C = -centro.y; }",
    "  if (vB.y < 0.0) { B = -centro.y; }",
    "  gl_FragColor = vec4(0.5 * (D - E + C - B), 0.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var PRESSAO = CABECA + [
    "uniform sampler2D uPressao;",
    "uniform sampler2D uDivergencia;",
    "void main() {",
    "  float E = texture2D(uPressao, vE).x;",
    "  float D = texture2D(uPressao, vD).x;",
    "  float C = texture2D(uPressao, vC).x;",
    "  float B = texture2D(uPressao, vB).x;",
    "  float div = texture2D(uDivergencia, vUv).x;",
    "  gl_FragColor = vec4((E + D + C + B - div) * 0.25, 0.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  // [ARMADILHA] o 0.5 já entrou na divergência; repetir aqui removeria só
  // metade dela e o fluido continuaria comprimindo.
  var GRADIENTE = CABECA + [
    "uniform sampler2D uPressao;",
    "uniform sampler2D uVelocidade;",
    "void main() {",
    "  float E = texture2D(uPressao, vE).x;",
    "  float D = texture2D(uPressao, vD).x;",
    "  float C = texture2D(uPressao, vC).x;",
    "  float B = texture2D(uPressao, vB).x;",
    "  vec2 v = texture2D(uVelocidade, vUv).xy;",
    "  v -= vec2(D - E, C - B);",
    "  gl_FragColor = vec4(v, 0.0, 1.0);",
    "}"
  ].join("\n");

  // A REVELAÇÃO. As três linhas de sempre (a luz do fluido vira máscara
  // entre a peça apagada e a acesa), mais duas coisas desta peça:
  //  - um halo dourado onde a luz passa, mesmo fora da luminária, para a
  //    mão ter resposta em qualquer ponto da tela;
  //  - uTudo, que acende a peça inteira quando a meta é cumprida.
  var REVELACAO = CABECA + [
    "uniform sampler2D uLuz;",
    "uniform sampler2D uApagada;",
    "uniform sampler2D uAcesa;",
    "uniform float uTamanho;",
    "uniform float uSuavidade;",
    "uniform float uLargura;",
    "uniform float uProporcaoImagem;",
    "uniform float uProporcaoTela;",
    "uniform float uTudo;",
    "",
    "const vec3 OURO = vec3(0.847, 0.639, 0.290);",
    "",
    "vec2 coverUv(vec2 uv, float aspImg, float aspTela) {",
    "  vec2 razao = vec2(min(aspTela / aspImg, 1.0), min(aspImg / aspTela, 1.0));",
    "  return vec2(uv.x * razao.x + (1.0 - razao.x) * 0.5,",
    "              uv.y * razao.y + (1.0 - razao.y) * 0.5);",
    "}",
    "",
    "void main() {",
    "  vec2 uv = coverUv(vUv, uProporcaoImagem, uProporcaoTela);",
    "  vec2 st = vec2(uv.x, 1.0 - uv.y);",
    "  vec3 apagada = texture2D(uApagada, st).rgb;",
    "  vec3 acesa = texture2D(uAcesa, st).rgb;",
    "",
    "  float bruto = texture2D(uLuz, vUv).r * uTamanho;",
    "  float mascara = smoothstep(uSuavidade, uSuavidade + uLargura, bruto);",
    "",
    "  vec3 cor = mix(apagada, acesa, max(mascara, uTudo));",
    "  // o halo: luz quente no ar, fraca, que some antes da peça",
    "  cor += OURO * clamp(bruto, 0.0, 1.0) * 0.075 * (1.0 - uTudo);",
    "  gl_FragColor = vec4(cor, 1.0);",
    "}"
  ].join("\n");

  var progCopia = programa(COPIA), progSplat = programa(SPLAT),
      progAdveccao = programa(ADVECCAO), progDivergencia = programa(DIVERGENCIA),
      progPressao = programa(PRESSAO), progGradiente = programa(GRADIENTE),
      progRevelacao = programa(REVELACAO);
  if (!progCopia || !progSplat || !progAdveccao || !progDivergencia ||
      !progPressao || !progGradiente || !progRevelacao) return null;

  // ------------------------------------------------------------------
  // 3. GEOMETRIA e FRAMEBUFFERS
  // ------------------------------------------------------------------
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function desenhar(destino) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, destino ? destino.fbo : null);
    gl.viewport(0, 0,
      destino ? destino.largura : gl.drawingBufferWidth,
      destino ? destino.altura : gl.drawingBufferHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function criarFBO(largura, altura) {
    gl.activeTexture(gl.TEXTURE0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, formatoMeio.interno, largura, altura, 0,
                  formatoMeio.formato, formatoMeio.tipo, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
    gl.viewport(0, 0, largura, altura);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex: tex, fbo: fbo, largura: largura, altura: altura,
      texel: [1 / largura, 1 / altura],
      ligar: function (unidade) {
        gl.activeTexture(gl.TEXTURE0 + unidade);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        return unidade;
      }
    };
  }
  function criarPar(l, a) {
    var x = criarFBO(l, a), y = criarFBO(l, a);
    if (!x || !y) return null;
    return { ler: x, escrever: y,
             trocar: function () { var t = this.ler; this.ler = this.escrever; this.escrever = t; } };
  }

  var velocidade = criarPar(CFG.resSim, CFG.resSim);
  var luz = criarPar(CFG.resLuz, CFG.resLuz);
  var divergencia = criarFBO(CFG.resSim, CFG.resSim);
  var pressao = criarPar(CFG.resSim, CFG.resSim);
  if (!velocidade || !luz || !divergencia || !pressao) return null;

  // ------------------------------------------------------------------
  // 4. AS DUAS IMAGENS (mesma câmera no Blender: alinhadas pixel a pixel)
  // ------------------------------------------------------------------
  function texturaVazia(r, g, b) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([r, g, b, 255]));
    return t;
  }
  var texApagada = texturaVazia(12, 11, 10);
  var texAcesa = texturaVazia(12, 11, 10);
  var carregadas = 0;
  var mascaraPeca = null;   // células da grade que SÃO luminária

  function carregar(src, tex, aoFim) {
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      carregadas++;
      if (aoFim) aoFim(img);
    };
    img.src = src;
  }

  // ------------------------------------------------------------------
  // 5. O MEDIDOR: medido contra meta
  // ------------------------------------------------------------------
  // Uma grade de 96 x 54 sobre o QUADRO. Só contam as células onde a
  // luminária está de fato (lidas da própria imagem acesa), então passar
  // a mão no fundo preto não enche o medidor: o serviço é a peça.
  var GL_ = 96, GA_ = 54;
  var visitada = new Uint8Array(GL_ * GA_);
  var totalPeca = 0, acertos = 0, cumprido = false, tudo = 0;

  function lerMascara(img) {
    var c = document.createElement("canvas");
    c.width = GL_; c.height = GA_;
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0, GL_, GA_);
    var d = g.getImageData(0, 0, GL_, GA_).data;
    mascaraPeca = new Uint8Array(GL_ * GA_);
    for (var i = 0; i < GL_ * GA_; i++) {
      var l = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
      if (l > 60) { mascaraPeca[i] = 1; totalPeca++; }
    }
  }

  // Tela (0..1, origem em cima à esquerda) -> quadro (0..1), pela mesma
  // conta de "cover" que o shader faz. Se as duas contas divergirem, o
  // medidor mede um lugar e a luz aparece em outro.
  function telaParaQuadro(nx, ny) {
    var aspTela = tela.clientWidth / Math.max(1, tela.clientHeight);
    var rx = Math.min(aspTela / ASP_IMG, 1), ry = Math.min(ASP_IMG / aspTela, 1);
    return { u: nx * rx + (1 - rx) * 0.5, v: ny * ry + (1 - ry) * 0.5 };
  }

  function carimbar(u, v) {
    if (!mascaraPeca || cumprido) return;
    var cx = Math.floor(u * GL_), cy = Math.floor(v * GA_);
    var R = 3;   // raio do pincel em células: ~3 % da largura do quadro
    for (var y = cy - R; y <= cy + R; y++) {
      if (y < 0 || y >= GA_) continue;
      for (var x = cx - R; x <= cx + R; x++) {
        if (x < 0 || x >= GL_) continue;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > R * R) continue;
        var i = y * GL_ + x;
        if (mascaraPeca[i] && !visitada[i]) { visitada[i] = 1; acertos++; }
      }
    }
  }

  function medir() {
    if (!totalPeca) return 0;
    return acertos / totalPeca;
  }

  // ------------------------------------------------------------------
  // 6. PONTEIRO
  // ------------------------------------------------------------------
  var ponteiro = { x: 0.5, y: 0.5, dx: 0, dy: 0, moveu: false, dentro: false, antes: null };

  function registrar(clienteX, clienteY) {
    var r = tela.getBoundingClientRect();
    if (clienteY < r.top || clienteY > r.bottom) return;
    var nx = (clienteX - r.left) / r.width;
    var nyTopo = (clienteY - r.top) / r.height;
    var ny = 1.0 - nyTopo;
    ponteiro.dx = (nx - ponteiro.x) * CFG.forcaSplat;
    ponteiro.dy = (ny - ponteiro.y) * CFG.forcaSplat;
    ponteiro.x = nx; ponteiro.y = ny;
    ponteiro.moveu = true;
    ponteiro.dentro = true;

    // Carimba o trajeto inteiro, não só o ponto: um movimento rápido
    // pula células, e o medidor mentiria para baixo.
    var q = telaParaQuadro(nx, nyTopo);
    var a = ponteiro.antes || q;
    var passos = Math.max(1, Math.ceil(Math.hypot(q.u - a.u, q.v - a.v) * GL_ / 1.5));
    for (var s = 1; s <= passos; s++) {
      var f = s / passos;
      carimbar(a.u + (q.u - a.u) * f, a.v + (q.v - a.v) * f);
    }
    ponteiro.antes = q;
  }

  function aoMover(e) { registrar(e.clientX, e.clientY); }
  function aoTocar(e) { if (e.touches.length) registrar(e.touches[0].clientX, e.touches[0].clientY); }
  window.addEventListener("pointermove", aoMover, { passive: true });
  window.addEventListener("touchmove", aoTocar, { passive: true });

  // ------------------------------------------------------------------
  // 7. DIMENSIONAMENTO
  // ------------------------------------------------------------------
  function dimensionar() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var l = Math.floor(tela.clientWidth * dpr), a = Math.floor(tela.clientHeight * dpr);
    if (l && a && (tela.width !== l || tela.height !== a)) { tela.width = l; tela.height = a; }
  }
  dimensionar();
  window.addEventListener("resize", dimensionar);

  // ------------------------------------------------------------------
  // 8. PASSES
  // ------------------------------------------------------------------
  function usar(prog, texel) {
    gl.useProgram(prog.p);
    if (prog.u.uTexel) gl.uniform2f(prog.u.uTexel, texel[0], texel[1]);
  }

  function splat(x, y, dx, dy, quanto) {
    var proporcao = tela.width / Math.max(1, tela.height);
    usar(progSplat, velocidade.ler.texel);
    gl.uniform1i(progSplat.u.uAlvo, velocidade.ler.ligar(0));
    gl.uniform1f(progSplat.u.uProporcao, proporcao);
    gl.uniform2f(progSplat.u.uPonto, x, y);
    gl.uniform3f(progSplat.u.uCor, dx, dy, 0.0);
    gl.uniform1f(progSplat.u.uRaio, CFG.raioSplat);
    desenhar(velocidade.escrever);
    velocidade.trocar();

    usar(progSplat, luz.ler.texel);
    gl.uniform1i(progSplat.u.uAlvo, luz.ler.ligar(0));
    gl.uniform1f(progSplat.u.uProporcao, proporcao);
    gl.uniform2f(progSplat.u.uPonto, x, y);
    gl.uniform3f(progSplat.u.uCor, quanto, quanto, quanto);
    gl.uniform1f(progSplat.u.uRaio, CFG.raioSplat);
    desenhar(luz.escrever);
    luz.trocar();
  }

  var ultimo = performance.now(), vivo = true, pausado = false, quadros = 0;

  function passo(agora) {
    if (!vivo) return;
    requestAnimationFrame(passo);
    if (pausado || document.visibilityState !== "visible") { ultimo = agora; return; }
    // [ARMADILHA] dt real medido, com teto: dt fixo 1.0 viola o CFL e a
    // simulação morre.
    var dt = Math.min((agora - ultimo) / 1000, 0.0333);
    ultimo = agora;
    if (dt <= 0) return;
    simular(dt);
  }

  var ultimoMedido = -1;

  function simular(dt) {
    dimensionar();

    if (ponteiro.moveu) {
      ponteiro.moveu = false;
      splat(ponteiro.x, ponteiro.y, ponteiro.dx, ponteiro.dy, 0.42);
    }

    // o medidor
    var m = medir();
    if (Math.abs(m - ultimoMedido) > 0.004) {
      ultimoMedido = m;
      aoMedir(Math.min(1, m), CFG.meta);
    }
    if (!cumprido && m >= CFG.meta) {
      cumprido = true;
      aoMedir(Math.min(1, m), CFG.meta);
      aoCumprir();
    }
    // a peça inteira acende devagar: 1,4 s, a mesma duração dos fades do deck
    if (cumprido && tudo < 1) tudo = Math.min(1, tudo + dt / 1.4);

    gl.disable(gl.BLEND);

    // [ARMADILHA] dissipação POR SEGUNDO, senão o visual muda com a taxa
    // de quadros do monitor.
    var dissVel = Math.pow(CFG.dissipacaoVelocidade, dt * 60);
    var dissLuz = Math.pow(CFG.dissipacaoLuz, dt * 60);

    usar(progAdveccao, velocidade.ler.texel);
    gl.uniform2f(progAdveccao.u.uTexelVel, velocidade.ler.texel[0], velocidade.ler.texel[1]);
    gl.uniform1i(progAdveccao.u.uVelocidade, velocidade.ler.ligar(0));
    gl.uniform1i(progAdveccao.u.uFonte, velocidade.ler.ligar(0));
    gl.uniform1f(progAdveccao.u.uDt, dt);
    gl.uniform1f(progAdveccao.u.uDissipacao, dissVel);
    desenhar(velocidade.escrever);
    velocidade.trocar();

    usar(progDivergencia, velocidade.ler.texel);
    gl.uniform1i(progDivergencia.u.uVelocidade, velocidade.ler.ligar(0));
    desenhar(divergencia);

    usar(progCopia, pressao.ler.texel);
    gl.uniform1i(progCopia.u.uTex, pressao.ler.ligar(0));
    desenhar(pressao.escrever);
    pressao.trocar();

    usar(progPressao, velocidade.ler.texel);
    gl.uniform1i(progPressao.u.uDivergencia, divergencia.ligar(0));
    for (var i = 0; i < CFG.iteracoesPressao; i++) {
      gl.uniform1i(progPressao.u.uPressao, pressao.ler.ligar(1));
      desenhar(pressao.escrever);
      pressao.trocar();
    }

    usar(progGradiente, velocidade.ler.texel);
    gl.uniform1i(progGradiente.u.uPressao, pressao.ler.ligar(0));
    gl.uniform1i(progGradiente.u.uVelocidade, velocidade.ler.ligar(1));
    desenhar(velocidade.escrever);
    velocidade.trocar();

    // advecção da luz: sem este passe a luz não anda e o efeito morre
    usar(progAdveccao, luz.ler.texel);
    gl.uniform2f(progAdveccao.u.uTexelVel, velocidade.ler.texel[0], velocidade.ler.texel[1]);
    gl.uniform1i(progAdveccao.u.uVelocidade, velocidade.ler.ligar(0));
    gl.uniform1i(progAdveccao.u.uFonte, luz.ler.ligar(1));
    gl.uniform1f(progAdveccao.u.uDt, dt);
    gl.uniform1f(progAdveccao.u.uDissipacao, dissLuz);
    desenhar(luz.escrever);
    luz.trocar();

    // revelação
    usar(progRevelacao, [1 / tela.width, 1 / tela.height]);
    gl.uniform1i(progRevelacao.u.uLuz, luz.ler.ligar(0));
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texApagada);
    gl.uniform1i(progRevelacao.u.uApagada, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texAcesa);
    gl.uniform1i(progRevelacao.u.uAcesa, 2);
    gl.uniform1f(progRevelacao.u.uTamanho, CFG.tamanhoRevelacao);
    gl.uniform1f(progRevelacao.u.uSuavidade, CFG.suavidadeBorda);
    gl.uniform1f(progRevelacao.u.uLargura, CFG.larguraBorda);
    gl.uniform1f(progRevelacao.u.uProporcaoImagem, ASP_IMG);
    gl.uniform1f(progRevelacao.u.uProporcaoTela, tela.width / Math.max(1, tela.height));
    gl.uniform1f(progRevelacao.u.uTudo, tudo * tudo * (3 - 2 * tudo));
    desenhar(null);

    quadros++;
  }

  // Um sopro inicial pela base da peça: sem ele a primeira tela é uma
  // luminária apagada e ninguém descobre que dá para acendê-la. Ele NÃO
  // conta no medidor: quem acende é a pessoa.
  function convite() {
    var t = 0, passos = 30;
    var timer = setInterval(function () {
      if (ponteiro.dentro || t >= passos || pausado) { clearInterval(timer); return; }
      var f = t / passos;
      // tela -> em cima da peça, subindo em S
      var q0 = { u: CAIXA.x0 + 0.02, v: CAIXA.y1 - 0.04 };
      var aspTela = tela.clientWidth / Math.max(1, tela.clientHeight);
      var rx = Math.min(aspTela / ASP_IMG, 1), ry = Math.min(ASP_IMG / aspTela, 1);
      var u = q0.u + Math.sin(f * 6.28) * 0.07 + 0.08;
      var v = q0.v - f * (CAIXA.y1 - CAIXA.y0) * 0.8;
      var nx = (u - (1 - rx) * 0.5) / rx;
      var nyTopo = (v - (1 - ry) * 0.5) / ry;
      splat(nx, 1 - nyTopo, Math.cos(f * 6.28) * 900, 700, 0.30);
      t++;
    }, 45);
  }

  carregar(srcApagada, texApagada);
  carregar(srcAcesa, texAcesa, function (img) { lerMascara(img); });

  requestAnimationFrame(function (t) { ultimo = t; passo(t); });
  setTimeout(convite, 900);

  // Lê o quadro de volta da GPU. É a única prova de que a luz se move:
  // shader compilando e gl.getError() limpo não provam nada.
  function ler() {
    var l = tela.width, a = tela.height;
    var px = new Uint8Array(l * a * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, l, a, gl.RGBA, gl.UNSIGNED_BYTE, px);
    var soma = 0, quentes = 0;
    for (var i = 0; i < px.length; i += 4) {
      var v = px[i] + px[i + 1] + px[i + 2];
      soma += v;
      if (v > 330) quentes++;
    }
    return { media: +(soma / (l * a) / 3).toFixed(2), acesos: +(quentes / (l * a) * 100).toFixed(2) };
  }

  return {
    pronto: function () { return carregadas === 2 && !!mascaraPeca; },
    pausar: function (sim) { pausado = !!sim; },
    parar: function () {
      vivo = false;
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("touchmove", aoTocar);
    },
    // Acende tudo de uma vez: a saída para teclado, toque sem arrasto e
    // para quem apresenta com passador.
    acenderTudo: function () {
      if (cumprido) return;
      cumprido = true;
      acertos = totalPeca;
      aoMedir(1, CFG.meta);
      aoCumprir();
    },
    // Diagnóstico: roda N quadros AGORA (o rAF não dispara em aba oculta)
    // e lê o resultado no mesmo turno do desenho.
    renderizarAgora: function (n, dt) {
      var leitura = null;
      for (var i = 0; i < (n || 1); i++) { simular(dt || 0.016); leitura = ler(); }
      return leitura;
    },
    passarMao: function (pontos) {
      // pontos: [[clientX, clientY], ...] — simula um gesto real
      for (var i = 0; i < pontos.length; i++) { registrar(pontos[i][0], pontos[i][1]); simular(0.016); }
      return { medido: +medir().toFixed(3), cumprido: cumprido };
    },
    diagnostico: function () {
      return { quadros: quadros, webgl2: webgl2, carregadas: carregadas,
               totalPeca: totalPeca, medido: +medir().toFixed(3), cumprido: cumprido, tudo: +tudo.toFixed(2) };
    }
  };
};
