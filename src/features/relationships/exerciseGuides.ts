import { localizedSupplementalCatalog } from './supplementalCatalog';

// Keep the instructions tied to the catalog movement, even when a trainer renames it.
export const exerciseGuides: Readonly<Partial<Record<string, readonly string[]>>> = {
  ...Object.fromEntries(
    localizedSupplementalCatalog.map(({ id, instructions }) => [id, instructions]),
  ),
  edb_DsgkuIt: [
    'Em pé, segure os halteres ao lado do corpo, com os cotovelos levemente dobrados.',
    'Eleve os braços para os lados até perto da altura dos ombros. Mantenha o tronco firme e os ombros longe das orelhas.',
    'Desça devagar pelo mesmo caminho, sem balançar o corpo.',
  ],
  edb_eYnzaCm: [
    'Sente de frente para a polia alta e segure a barra com o tronco firme.',
    'Puxe a barra em direção à parte alta do peito, guiando o movimento pelos cotovelos.',
    'Deixe a barra subir com controle até estender os braços.',
  ],
  edb_goJ6ezq: [
    'Segure o puxador da polia baixa com o cotovelo levemente dobrado.',
    'Eleve o braço para o lado até perto da altura do ombro, sem inclinar o tronco.',
    'Baixe o braço devagar, mantendo a tensão no cabo.',
  ],
  edb_2NpxjC1: [
    'Segure os halteres ao lado do corpo com as palmas voltadas uma para a outra.',
    'Dobre os cotovelos mantendo os punhos alinhados e os braços próximos ao tronco.',
    'Baixe os halteres com controle, sem balançar o corpo.',
  ],
  edb_SpYC0Kp: [
    'Deite no banco reto com os pés apoiados. Posicione os halteres acima do peito.',
    'Dobre os cotovelos e desça os halteres ao lado do peito, com os punhos alinhados aos antebraços.',
    'Empurre os halteres para cima com controle e mantenha os pés apoiados.',
  ],
  edb_EIeI8Vf: [
    'Deite no banco com os pés firmes no chão e segure a barra com as duas mãos.',
    'Desça a barra em direção ao peito com controle e mantenha os punhos alinhados.',
    'Empurre a barra para cima mantendo os ombros apoiados no banco.',
  ],
  edb_B3Rxp6L: [
    'Apoie as costas no banco inclinado e plante os pés no chão. Posicione os halteres acima do peito.',
    'Desça os halteres com controle, mantendo os punhos alinhados com os antebraços.',
    'Empurre os halteres para cima sem tirar o tronco do encosto.',
  ],
  edb_PdmaD0N: [
    'Em pé, segure um halter acima da cabeça e mantenha o abdômen firme.',
    'Dobre o cotovelo para levar o halter atrás da cabeça, mantendo o braço estável.',
    'Estenda o cotovelo para voltar, sem balançar o tronco.',
  ],
  edb_v3xmPAR: [
    'Ajuste o banco para que as alças fiquem próximas da altura do peito e apoie as costas.',
    'Aproxime os braços à frente do peito com os cotovelos levemente dobrados.',
    'Retorne devagar, sem deixar o peso puxar os braços para trás.',
  ],
  edb_aaXr7ld: [
    'Posicione-se na máquina e segure as alças com o tronco firme.',
    'Puxe as alças em direção ao tronco, guiando o movimento pelos cotovelos.',
    'Estenda os braços devagar para voltar ao início.',
  ],
  edb_x69MAlq: [
    'De frente para a polia alta, segure a barra com os braços à frente e os cotovelos levemente dobrados.',
    'Puxe a barra em arco até perto das coxas, mantendo o ângulo dos cotovelos.',
    'Volte com controle, sem balançar o tronco.',
  ],
  edb_BU15nH4: [
    'Segure um halter de cada lado, com os cotovelos próximos do corpo.',
    'Dobre um cotovelo e gire a palma para cima enquanto eleva o halter.',
    'Desça com controle e repita com o outro braço, mantendo o tronco firme.',
  ],
  edb_oHsrypV: [
    'Sente na máquina com as costas apoiadas e ajuste as almofadas na parte interna das pernas.',
    'Aproxime as pernas de forma controlada, mantendo o quadril no assento.',
    'Deixe as pernas abrirem devagar até a posição inicial.',
  ],
  edb_Qa55kX1: [
    'Apoie as costas no encosto e plante os pés na plataforma.',
    'Dobre os joelhos para descer, mantendo os calcanhares apoiados e os joelhos na direção dos pés.',
    'Empurre a plataforma para estender as pernas e retornar com controle.',
  ],
  edb_hrVQWvE: [
    'Segure a barra à frente das coxas e mantenha os joelhos levemente flexionados.',
    'Leve o quadril para trás e desça a barra perto das pernas, até onde consegue manter a postura.',
    'Traga o quadril à frente para voltar à posição em pé, sem inclinar o tronco para trás.',
  ],
  edb_my33uHU: [
    'Ajuste o banco para alinhar os joelhos ao eixo da máquina e posicione o rolo acima dos tornozelos.',
    'Estenda os joelhos para levantar o rolo, mantendo as costas apoiadas.',
    'Dobre os joelhos devagar para voltar à posição inicial.',
  ],
};
