/* Palabra del día: un versículo o una frase, el mismo durante todo el día y en todos los dispositivos. */

export const VERSES = [
  ['Todo lo puedo en Cristo que me fortalece.', 'Filipenses 4:13'],
  ['Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo dondequiera que vayas.', 'Josué 1:9'],
  ['Jehová es mi pastor; nada me faltará.', 'Salmos 23:1'],
  ['Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.', 'Proverbios 3:5'],
  ['Reconócelo en todos tus caminos, y él enderezará tus veredas.', 'Proverbios 3:6'],
  ['Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.', 'Isaías 40:31'],
  ['Así que, no os afanéis por el día de mañana, porque el día de mañana traerá su afán. Basta a cada día su propio mal.', 'Mateo 6:34'],
  ['Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.', 'Romanos 8:28'],
  ['Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.', 'Salmos 118:24'],
  ['Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.', 'Lamentaciones 3:22-23'],
  ['Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.', 'Proverbios 16:3'],
  ['Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.', 'Colosenses 3:23'],
  ['No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.', 'Gálatas 6:9'],
  ['Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.', '2 Timoteo 1:7'],
  ['Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.', 'Salmos 46:1'],
  ['Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', 'Mateo 11:28'],
  ['La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.', 'Juan 14:27'],
  ['Encomienda a Jehová tu camino, y confía en él; y él hará.', 'Salmos 37:5'],
  ['No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré.', 'Isaías 41:10'],
  ['Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.', 'Filipenses 4:6'],
  ['Sobre toda cosa guardada, guarda tu corazón; porque de él mana la vida.', 'Proverbios 4:23'],
  ['Todas vuestras cosas sean hechas con amor.', '1 Corintios 16:14'],
  ['Enséñanos de tal modo a contar nuestros días, que traigamos al corazón sabiduría.', 'Salmos 90:12'],
  ['Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.', 'Jeremías 29:11'],
  ['Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro? Mi socorro viene de Jehová, que hizo los cielos y la tierra.', 'Salmos 121:1-2'],
  ['Gozosos en la esperanza; sufridos en la tribulación; constantes en la oración.', 'Romanos 12:12'],
  ['Ve a la hormiga, oh perezoso, mira sus caminos, y sé sabio.', 'Proverbios 6:6'],
  ['Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?', 'Salmos 27:1']
];

export const PHRASES = [
  'La disciplina es elegir lo que más querés por encima de lo que querés ahora.',
  'No hace falta que hoy sea perfecto. Hace falta que hoy cuente.',
  'Un día malo no es una semana perdida. Mañana se vuelve al plan.',
  'Lo que hacés todos los días pesa más que lo que hacés de vez en cuando.',
  'Empezá por lo más chico. El impulso viene después de arrancar, no antes.',
  'La motivación va y viene. El hábito se queda.',
  'Cada ítem tachado es una promesa que te cumpliste a vos mismo.',
  'No compitas con nadie. Compará quién sos hoy con quién eras ayer.',
  'Hacé hoy lo que tu yo de mañana te va a agradecer.',
  'El orden de afuera ayuda al orden de adentro.',
  'No esperes a tener ganas. Las ganas aparecen cuando ya estás en movimiento.',
  'Pequeño y constante le gana a grande y de vez en cuando.',
  'La versión de vos que querés ser se construye con días comunes.',
  'Si no podés hacerlo todo, hacé lo próximo.',
  'Descansar también es parte del plan. Abandonar no.',
  'Lo importante rara vez es urgente. Por eso hay que agendarlo.',
  'Tu futuro se decide en lo que repetís, no en lo que prometés.',
  'Terminá lo que empezaste antes de empezar algo nuevo.',
  'El progreso lento sigue siendo progreso.',
  'Ser constante es volver, no no fallar nunca.',
  'Un buen día se arma con buenas mañanas.',
  'Cuidá tu energía: es lo que te deja cumplir con todo lo demás.',
  'Hacé las cosas bien aunque nadie las vea.',
  'Agradecé lo que tenés mientras trabajás por lo que querés.',
  'La claridad llega haciendo, no pensando de más.',
  'Hoy es una buena oportunidad para ser un poco mejor que ayer.',
  'Cumplí con lo chico y lo grande se va acomodando.',
  'Tu palabra vale también cuando te la das a vos mismo.'
];

// Número de día local desde 1970, para que cambie a la medianoche.
function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
}
// Recorre la lista en un orden mezclado fijo, para que no se repita en días seguidos.
function pick(list, n, salt) {
  const len = list.length;
  const step = [7, 11, 13, 17, 19, 23].find((s) => len % s !== 0) || 1;
  return list[((n * step) + salt) % len];
}

// kind: 'mix' (alterna), 'verse' o 'phrase'
export function wordOfDay(key, kind = 'mix') {
  const n = dayNumber(key);
  const useVerse = kind === 'verse' || (kind === 'mix' && n % 2 === 0);
  if (useVerse) {
    const [text, ref] = pick(VERSES, kind === 'mix' ? Math.floor(n / 2) : n, 3);
    return { type: 'verse', label: 'Versículo del día', text, ref };
  }
  return { type: 'phrase', label: 'Frase del día', text: pick(PHRASES, kind === 'mix' ? Math.floor(n / 2) : n, 5), ref: '' };
}
