#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-3.0-only
# VERO transformation and Vereda answer curation, 2026-09-26.
# VERO copyright (C) 2006-2013 Raimundo Santos Moura and contributors.
# Full notices, GPLv3/LGPLv3 and source links: ../docs/palavra-dicionario.md
"""Build the editable, local five-letter Portuguese word bank; no app code copied."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

PIN = '5cf23af85b47be6e398add826da1a02175be4238'
BASE = 'https://raw.githubusercontent.com/LibreOffice/dictionaries/' + PIN + '/pt_BR/'
EXPECTED = {'pt_BR.dic': 'a38bfb26b68ece2834e79fe83e48d5792652970ace12db89d1b9674bf9933183', 'pt_BR.aff': '21d8ad2a769a60e17e2b5ea4ef11d4d593a58b9e2a82d642ef82d6a4c5523865'}

# Editorial selection for answers. Accents are deliberately accepted here and
# normalized only at export. This is not a frequency ranking or a daily puzzle.
CURATED = '''
ABRIR ACASO ACESO ACHAR ADEUS ADIAR AFETO AGORA AINDA ALBUM ALUNO AMADO AMIGO AMORA AMPLO
ANDAR ANEXO ANIMO ANTES APOIO ARAME AREIA AROMA ARROZ ASSAR ATLAS ATOMO ATRAS ATUAL AUDIO AUTOR AVIAO AVISO AZEDO
BAIXO BALAO BALDE BANCO BANHO BARCO BARRO BATOM BEIJO BEIRA BICHO BOLHA BOLSA BORDA BRACO BRASA BRAVO BREVE BRISA BROTO
CABER CACAU CAIXA CALDO CALMA CALOR CAMPO CANOA CANTO CAPAZ CAPIM CARGA CARNE CARRO CARTA CASAL CASAS CAUSA
CENAS CERCA CERTO CESTA CHAMA CHAVE CHEFE CHEIO CHUVA CICLO CINCO CINZA CLARO CLIMA COBRA COLAR CORES CORPO CORTE COURO
CRAVO CRIAR CRISE CURVA CURTO CUSTO DADOS DANCA DENTE DIZER DOBRA DORES DRAMA DUPLA DUZIA EIXOS ETAPA EXATO
FACIL FALHA FALTA FAROL FATIA FAVOR FAZER FEIRA FELIZ FERRO FESTA FIBRA FICAR FILHO FINAL FIRME FLORA FLUIR FOGAO FOLHA
FONTE FORMA FORNO FORTE FOSCO FRASE FREIO FRUTA FUGIR FUNDO FUSAO GALHO GANHO GARRA GASTO GENIO GERAR GESTO GLOBO GOSTO
GRACA GRAMA GRUPO HONRA HOTEL HUMOR IDEAL IGUAL ILHAS IMPAR JARRA JEITO JOGAR JOVEM JUNTO JUSTO LAPIS LARGO LASER LENTO
LEVAR LIGAR LILAS LIMAO LIMPO LINHA LIVRE LIVRO LOCAL LONGE LUGAR LUNAR LUZES MAGIA MAIOR MANGA MANHA MARCA MEDIR MENOR
METAL METRO MILHO MIOLO MOLDE MOLHO MONTE MOVER MUDAR MUNDO MUSGO NADAR NARIZ NATAL NAVIO NEGRO NOBRE NOITE NORTE NUVEM
OBRAS OLHAR ONDAS ONTEM OSSOS OUVIR PACTO PALCO PALHA PAPEL PARTE PASSO PASTA PAUSA PEDIR PEDRA PEIXE PIANO PILHA PINHO
PISTA PLANO PLUMA POBRE PODER PONTE PONTO PORTA POSSE PRAIA PRATA PRAZO PRECO PRETO PROSA PROVA QUASE QUEDA QUERO QUINA
RADIO RAMOS RAZAO REGRA REINO RENDA RETAS RITMO ROCHA RODAR ROUPA SABER SABOR SALAO SALTO SAUDE SEIVA SELVA SENSO SERIE
SERIO SINAL SOBRE SOLAR SONHO SONSO SOPRO SORTE SUAVE SURDO TANTO TARDE TATIL TELAS TEMPO TENDA TERCA TERMO TERNO TERRA
TIGRE TINTA TOQUE TOTAL TRACO TRAMA TREVO TRIGO TRONO TROCA TURMA TURNO UNIAO UNICO USUAL VALOR VAZIO VELAS VELHO VENDA
VENTO VERDE VIDRO VIRAR VISTA VIVER VOLTA VOTOS VULTO ZEBRA ZELAR ZINCO
'''.split()
REQUIRED = 'TERMO TERNO TERCA ARROZ CARRO CASAS AMORA AROMA SOLAR LUZES MUSGO PAPEL'.split()
SUPPRESSED = set('Ýý~')  # NOSUGGEST, FORBIDDENWORD and WARN in this exact .aff.


def normalize(word):
    value = ''.join(c for c in unicodedata.normalize('NFD', word) if not unicodedata.combining(c)).upper()
    return value if re.fullmatch(r'[A-Z]{5}', value) else None


def parse_rules(text):
    rules = {'PFX': {}, 'SFX': {}}
    cross = {}
    for line in text.splitlines():
        fields = line.split()
        if not fields or fields[0] not in rules:
            continue
        kind, flag = fields[:2]
        if len(fields) == 4:
            cross[(kind, flag)] = fields[2] == 'Y'
            continue
        strip, addition, condition = fields[2:5]
        addition, _, continuation = addition.partition('/')
        # This source's only continuation flags are NOSUGGEST expansions of
        # uppercase Brazilian state abbreviations. They are intentionally out.
        if set(continuation) & SUPPRESSED:
            continue
        if continuation:
            raise ValueError('Unreviewed continuation flags: ' + line)
        strip = '' if strip == '0' else strip
        addition = '' if addition == '0' else addition
        pattern = re.compile('^(?:'+condition+')' if kind == 'PFX' else '(?:'+condition+')$')
        rules[kind].setdefault(flag, []).append((strip, addition, pattern))
    return rules, cross


def apply(word, kind, rule):
    strip, addition, condition = rule
    if not condition.search(word):
        return None
    if kind == 'PFX':
        if strip and not word.startswith(strip):
            return None
        return addition + word[len(strip):]
    if strip and not word.endswith(strip):
        return None
    return (word[:-len(strip)] if strip else word) + addition


def extract(directory):
    rules, cross = parse_rules((directory/'pt_BR.aff').read_text(encoding='utf-8-sig'))
    accepted, bases, forbidden = set(), set(), set()
    entries = []
    for line in (directory/'pt_BR.dic').read_text(encoding='utf-8-sig').splitlines()[1:]:
        token = line.split()[0] if line.split() else ''
        word, _, flags = token.partition('/')
        if 'ý' in flags:
            forbidden.add(word)
        if not word.isalpha() or word != word.lower() or set(flags) & SUPPRESSED:
            continue
        entries.append((word, flags))
    def accept(word, base=False):
        if word in forbidden or word != word.lower():
            return
        value = normalize(word)
        if value:
            accepted.add(value)
            if base:
                bases.add(value)
    for word, flags in entries:
        accept(word, True)
        # The longest stripping operation in this pinned .aff is 7 letters.
        # No prefix shortens a word. Longer stems cannot produce five letters.
        if len(word) > 12:
            continue
        prefixes = [(flag, rule) for flag in flags for rule in rules['PFX'].get(flag, [])]
        for flag, rule in prefixes:
            if len(word)-len(rule[0])+len(rule[1]) == 5:
                value = apply(word, 'PFX', rule)
                if value:
                    accept(value)
        for flag in flags:
            for rule in rules['SFX'].get(flag, []):
                length = len(word)-len(rule[0])+len(rule[1])
                if length > 5 or length < 1:
                    continue
                value = apply(word, 'SFX', rule)
                if not value:
                    continue
                accept(value)
                if cross.get(('SFX', flag)):
                    for prefix_flag, prefix_rule in prefixes:
                        if cross.get(('PFX', prefix_flag)) and len(value)-len(prefix_rule[0])+len(prefix_rule[1]) == 5:
                            combined = apply(value, 'PFX', prefix_rule)
                            if combined:
                                accept(combined)
    return sorted(accepted), len(bases)


def build(directory, output):
    for name, expected in EXPECTED.items():
        actual = hashlib.sha256((directory/name).read_bytes()).hexdigest()
        if actual != expected:
            raise ValueError('Source hash mismatch: ' + name)
    allowed, base_count = extract(directory)
    candidates = {normalize(word) for word in CURATED}
    if None in candidates:
        raise ValueError('Curated answer is not five letters')
    candidates = sorted(candidates)
    missing = sorted(set(candidates)-set(allowed))
    if missing:
        raise ValueError('Curated answers missing from VERO: ' + ', '.join(missing))
    # Even selection across the alphabet keeps a concise editorial set while
    # preserving every manually required word, rather than favoring A–M.
    required = set(REQUIRED)
    rest = [word for word in candidates if word not in required]
    target = 240-len(required)
    selection = set(rest) if len(rest) <= target else {rest[i*(len(rest)-1)//(target-1)] for i in range(target)}
    answers = sorted(required | selection)
    assert 100 <= len(answers) <= 250
    assert len(allowed) > 3000
    assert required <= set(allowed)
    assert set(answers) <= set(allowed)
    assert len(allowed) == len(set(allowed)) and len(answers) == len(set(answers))
    assert all(re.fullmatch('[A-Z]{5}', w) for w in allowed+answers)
    def array(words):
        return '[\n' + ',\n'.join('    '+', '.join(json.dumps(w) for w in words[i:i+14]) for i in range(0,len(words),14)) + '\n  ]'
    source = '''/* SPDX-License-Identifier: LGPL-3.0-only
 * VERO pt-BR: Copyright (C) 2006-2013 Raimundo Santos Moura and contributors.
 * Five-letter normalization/curation for Vereda, 2026-09-26.
 * Source: LibreOffice/dictionaries, commit '''+PIN+'''.
 * This derived data file remains under GNU LGPL version 3; no warranty.
 * Attribution and full LGPLv3/GPLv3: docs/palavra-dicionario.md
 * Editable regeneration source: tools/build-word-list.py
 * Accents and cedilla are normalized. This is a game vocabulary, not a spellchecker.
 */
window.VEREDA_WORDS = {
  answers: '''+array(answers)+',\n  allowed: '+array(allowed)+'\n};\n'
    output.write_text(source,encoding='utf-8')
    print(json.dumps({'answers':len(answers),'allowed':len(allowed),'base_five_letter_forms':base_count,'additional_affixed_forms':len(allowed)-base_count,'bytes':output.stat().st_size,'required':REQUIRED},ensure_ascii=False))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir',type=Path,help='Directory containing the pinned pt_BR.dic and pt_BR.aff')
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parent.parent/'notebook-word-list.js')
    args=parser.parse_args()
    if args.source_dir:
        build(args.source_dir,args.output)
    else:
        with tempfile.TemporaryDirectory(prefix='vereda-vero-') as temporary:
            directory=Path(temporary)
            for name in EXPECTED:
                subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','60',BASE+name,'--output',str(directory/name)],check=True)
            build(directory,args.output)


if __name__ == '__main__':
    main()
