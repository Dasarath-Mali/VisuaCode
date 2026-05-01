// ===== LANGUAGE DETECTOR =====

const LanguageDetector = (() => {

  const SIGNATURES = [
    {
      lang: 'Python', color: '#4B8BBE',
      patterns: [/^\s*(def |class |import |from |if __name__|@\w+|async def)/m, /:\s*\n\s+/, /print\(/, /^\s*elif\s/m],
      keywords: ['def','elif','print','self','None','True','False','lambda','yield','with','as','pass']
    },
    {
      lang: 'JavaScript', color: '#F7DF1E',
      patterns: [/\bconst\b|\blet\b|\bvar\b/, /=>\s*{|=>\s*\w/, /function\s*\w*\s*\(/, /console\.log\(/, /document\.|window\.|require\(|import\s+.*from/],
      keywords: ['const','let','var','function','async','await','Promise','typeof','undefined','null','=>']
    },
    {
      lang: 'TypeScript', color: '#3178C6',
      patterns: [/:\s*(string|number|boolean|any|void|never|unknown)\b/, /interface\s+\w+|type\s+\w+\s*=/, /<[A-Z]\w*>/, /public|private|protected|readonly/],
      keywords: ['interface','type','enum','namespace','declare','implements','readonly','string','number','boolean']
    },
    {
      lang: 'Java', color: '#B07219',
      patterns: [/public\s+(class|static|void|int|String)\s/, /System\.out\.print/, /new\s+\w+\s*\(/, /import\s+java\./],
      keywords: ['public','private','protected','class','static','void','extends','implements','super','throws']
    },
    {
      lang: 'C++', color: '#659AD2',
      patterns: [/#include\s*[<"]/, /std::/, /cout\s*<</, /int\s+main\s*\(/, /::\s*\w+/],
      keywords: ['cout','cin','endl','namespace','template','vector','string','nullptr','const','auto']
    },
    {
      lang: 'C', color: '#A8B9CC',
      patterns: [/#include\s*[<"]/, /printf\s*\(/, /scanf\s*\(/, /int\s+main\s*\(\s*(void|int)/, /malloc\s*\(|free\s*\(/],
      keywords: ['printf','scanf','malloc','free','struct','typedef','NULL','sizeof','return']
    },
    {
      lang: 'C#', color: '#239120',
      patterns: [/using\s+System/, /Console\.(Write|Read)/, /namespace\s+\w+/, /public\s+(class|static|void|int|string)\s/],
      keywords: ['namespace','using','Console','var','string','int','bool','async','await','LINQ','foreach']
    },
    {
      lang: 'Go', color: '#00ADD8',
      patterns: [/^package\s+\w+/m, /^import\s+\(/m, /func\s+\w+\s*\(/, /fmt\.(Print|Println|Sprintf)/, /:=\s/],
      keywords: ['func','package','import','var','const','struct','interface','goroutine','chan','go','defer']
    },
    {
      lang: 'Rust', color: '#DEA584',
      patterns: [/fn\s+\w+\s*\(/, /let\s+(mut\s+)?\w+/, /println!\s*\(/, /use\s+std::/, /impl\s+\w+/],
      keywords: ['fn','let','mut','struct','enum','impl','trait','pub','mod','match','Some','None','Ok','Err']
    },
    {
      lang: 'PHP', color: '#8993BE',
      patterns: [/<\?php/, /\$\w+\s*=/, /echo\s+/, /->/, /function\s+\w+\s*\(/],
      keywords: ['echo','print','array','foreach','isset','empty','die','exit','$this','->']
    },
    {
      lang: 'Ruby', color: '#CC342D',
      patterns: [/def\s+\w+/, /puts\s+/, /end\s*$/m, /do\s*\|/, /attr_\w+\s+:/, /require\s+'/],
      keywords: ['def','end','puts','class','module','require','attr_accessor','nil','true','false','each']
    },
    {
      lang: 'Swift', color: '#FA7343',
      patterns: [/var\s+\w+\s*:/, /let\s+\w+\s*:/, /func\s+\w+\s*\(/, /print\s*\(/, /import\s+Foundation|import\s+UIKit/],
      keywords: ['var','let','func','class','struct','enum','protocol','extension','guard','optional','nil']
    },
    {
      lang: 'Kotlin', color: '#7F52FF',
      patterns: [/fun\s+\w+\s*\(/, /val\s+\w+/, /var\s+\w+/, /println\s*\(/, /data\s+class/],
      keywords: ['fun','val','var','class','object','companion','data','sealed','when','null','it','by']
    },
    {
      lang: 'SQL', color: '#E38C00',
      patterns: [/SELECT\s+.*FROM/i, /INSERT\s+INTO/i, /UPDATE\s+\w+\s+SET/i, /DELETE\s+FROM/i, /CREATE\s+(TABLE|DATABASE)/i],
      keywords: ['SELECT','FROM','WHERE','JOIN','GROUP','ORDER','HAVING','INNER','LEFT','RIGHT','UNION']
    },
    {
      lang: 'HTML', color: '#E34F26',
      patterns: [/<html|<HTML/, /<\/?div|<\/?p>|<\/?span/, /<!DOCTYPE/, /<head>|<body>|<meta|<link|<script/],
      keywords: ['<!DOCTYPE','<html','<head','<body','<div','<span','<p>','<a ','<img','<form']
    },
    {
      lang: 'CSS', color: '#1572B6',
      patterns: [/\w+\s*:\s*\w+[\w\s,#%()]+;/, /\s*\.\w+\s*{|\s*#\w+\s*{/, /@media\s+|@keyframes\s+/, /border-radius|background-color|font-size/],
      keywords: ['color','background','margin','padding','display','flex','grid','font-size','border','position']
    },
    {
      lang: 'Shell', color: '#89E051',
      patterns: [/^#!/, /\$\s*\w+/, /echo\s+"/, /if\s+\[/, /\|\s*grep|\|\s*awk/],
      keywords: ['echo','export','source','grep','awk','sed','chmod','sudo','mkdir','cd','ls','if','fi']
    },
    {
      lang: 'Dart', color: '#00B4AB',
      patterns: [/void\s+main\s*\(/, /print\s*\(/, /class\s+\w+\s+extends\s+StatefulWidget/, /Widget\s+build\s*\(/],
      keywords: ['void','final','const','Widget','State','StatefulWidget','StatelessWidget','async','await']
    },
  ];

  function detect(code) {
    if (!code || code.trim().length === 0) return { lang: 'Unknown', color: '#555' };

    const scores = {};
    for (const sig of SIGNATURES) {
      let score = 0;
      for (const pat of sig.patterns) if (pat.test(code)) score += 12;
      for (const kw of sig.keywords) {
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const m  = code.match(re);
        if (m) score += m.length * 2;
      }
      if (score > 0) scores[sig.lang] = score;
    }

    let best = null, bestScore = 0;
    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) { bestScore = score; best = lang; }
    }

    if (!best) return { lang: 'Unknown', color: '#555' };
    const found = SIGNATURES.find(s => s.lang === best);
    return { lang: found.lang, color: found.color };
  }

  return { detect };
})();

window.LanguageDetector = LanguageDetector;
