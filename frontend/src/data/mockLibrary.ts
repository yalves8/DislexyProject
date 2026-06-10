export interface Material {
  id: string;
  title: string;
  originalText: string;
  adaptedText: string;
  hasNewActivity?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
  materials: Material[];
}

const industrialRevolutionOriginal = `A Revolução Industrial foi um período de grandes transformações econômicas, sociais e tecnológicas que começou na Inglaterra, no século XVIII. Antes dela, muitos produtos eram feitos de forma artesanal, em pequenas oficinas ou nas casas das pessoas. Com o surgimento das máquinas, das fábricas e do uso do carvão como fonte de energia, a produção passou a ser mais rápida e em maior quantidade.

Esse processo mudou a vida de muitas pessoas. Muitos trabalhadores deixaram o campo e foram morar nas cidades para trabalhar nas fábricas. As cidades cresceram depressa, mas nem sempre tinham boas condições de moradia, higiene e segurança. Ao mesmo tempo, novas invenções, como a máquina a vapor, ajudaram no transporte, na indústria e no comércio.

A Revolução Industrial trouxe avanços importantes, mas também criou desafios. O trabalho nas fábricas podia ser cansativo, longo e perigoso. Por isso, ao longo do tempo, os trabalhadores começaram a lutar por melhores salários, menos horas de trabalho e mais direitos.`;

const industrialRevolutionAdapted = `A Revolução Industrial mudou o jeito de produzir coisas.

Ela começou na Inglaterra, no século XVIII.

Antes:
- Muitos objetos eram feitos à mão.
- As pessoas trabalhavam em casas ou oficinas pequenas.

Depois:
- Máquinas passaram a ajudar no trabalho.
- Surgiram muitas fábricas.
- A produção ficou mais rápida.

Muitas pessoas saíram do campo.
Elas foram morar nas cidades para trabalhar.

As cidades cresceram muito.
Mas havia problemas:
- casas ruins;
- pouca higiene;
- trabalho cansativo;
- pouca segurança.

Uma invenção importante foi a máquina a vapor.
Ela ajudou nas fábricas e nos transportes.

A Revolução Industrial trouxe avanços.
Também trouxe desafios.

Com o tempo, os trabalhadores pediram:
- melhores salários;
- menos horas de trabalho;
- mais direitos.`;

export const librarySubjects: Subject[] = [
  {
    id: "historia",
    name: "História",
    icon: "H",
    colorClass: "bg-orange-400",
    materials: [
      {
        id: "revolucao-industrial",
        title: "A Revolução Industrial",
        originalText: industrialRevolutionOriginal,
        adaptedText: industrialRevolutionAdapted,
        hasNewActivity: true,
      },
    ],
  },
  {
    id: "geografia",
    name: "Geografia",
    icon: "G",
    colorClass: "bg-emerald-500",
    materials: [
      {
        id: "biomas-brasileiros",
        title: "Biomas Brasileiros",
        originalText:
          "O Brasil tem diferentes biomas, como Amazônia, Cerrado, Caatinga, Mata Atlântica, Pantanal e Pampa. Cada bioma tem clima, plantas e animais próprios.",
        adaptedText:
          "O Brasil tem muitos biomas.\n\nCada bioma tem:\n- clima próprio;\n- plantas diferentes;\n- animais diferentes.\n\nExemplos:\n- Amazônia;\n- Cerrado;\n- Caatinga;\n- Mata Atlântica;\n- Pantanal;\n- Pampa.",
        hasNewActivity: true,
      },
    ],
  },
  {
    id: "matematica",
    name: "Matemática",
    icon: "M",
    colorClass: "bg-violet-500",
    materials: [
      {
        id: "fracoes",
        title: "Frações no Dia a Dia",
        originalText:
          "As frações representam partes de um todo. Podemos usar frações para dividir uma pizza, medir ingredientes ou comparar quantidades.",
        adaptedText:
          "Frações mostram partes de um todo.\n\nImagine uma pizza.\nSe ela tem 4 pedaços e você come 1, você comeu 1/4.\n\nFrações ajudam a:\n- dividir alimentos;\n- medir receitas;\n- comparar quantidades.",
      },
    ],
  },
  {
    id: "ciencias",
    name: "Ciências",
    icon: "C",
    colorClass: "bg-sky-500",
    materials: [
      {
        id: "ciclo-da-agua",
        title: "O Ciclo da Água",
        originalText:
          "O ciclo da água é o movimento contínuo da água na natureza. A água evapora, forma nuvens, cai como chuva e retorna para rios, mares e solos.",
        adaptedText:
          "A água se move na natureza.\n\nEsse movimento se chama ciclo da água.\n\nPassos:\n- o sol aquece a água;\n- a água evapora;\n- as nuvens se formam;\n- a chuva cai;\n- a água volta para rios, mares e solo.",
        hasNewActivity: true,
      },
    ],
  },
  {
    id: "portugues",
    name: "Português",
    icon: "P",
    colorClass: "bg-rose-400",
    materials: [
      {
        id: "generos-textuais",
        title: "Gêneros Textuais",
        originalText:
          "Os gêneros textuais são formas diferentes de organizar textos de acordo com sua finalidade, como notícia, carta, receita, poema e conto.",
        adaptedText:
          "Textos podem ter formas diferentes.\n\nCada forma tem uma função.\n\nExemplos:\n- notícia: informa;\n- carta: manda mensagem;\n- receita: ensina a preparar algo;\n- poema: brinca com palavras;\n- conto: conta uma história.",
      },
    ],
  },
];

export function findMaterial(subjectId: string | undefined, materialId: string | undefined) {
  const subject = librarySubjects.find((item) => item.id === subjectId);
  const material = subject?.materials.find((item) => item.id === materialId);

  return { subject, material };
}
