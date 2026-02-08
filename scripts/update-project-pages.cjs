/**
 * Generate project HTML pages from real R2 bucket image data.
 * Run: node scripts/update-project-pages.cjs
 */

const fs = require('fs');

const CDN = 'https://cdn.beckandersen.com';

const projects = {
  'as-light-turns-into-day': {
    title: 'As Light Turns Into Day',
    year: '2024\u2013present',
    medium: 'Photography, CMY/K Process Separation Lightboxes, Installation',
    description: 'This project examines light as humanity\u2019s first unit of measurement \u2014 an initial tool by which we began to order time and space. Through techniques like two-layer CMY/K process separation used in lightboxes, the work foregrounds the manipulation inherent to every image, shaping a narrative while making its artifice visible. The images shift from source material to artifacts in their own right, transforming the processes of printing, collaging, and re-photographing into acts of truth-making rather than truth-finding.',
    ogDesc: 'Photography, CMY/K Process Separation Lightboxes, Installation \u2014 2024\u2013present',
    prev: null,
    next: { slug: 'recalibration', title: 'Recalibration' },
    images: [
      { f: '001.jpg', w: 12589, h: 5690 }, { f: '002.jpg', w: 7762, h: 5175 },
      { f: '003.jpg', w: 7762, h: 5175 }, { f: '004.jpg', w: 7762, h: 5175 },
      { f: '005.jpg', w: 7762, h: 5175 }, { f: '006.jpg', w: 7762, h: 5175 },
      { f: '007.jpg', w: 5772, h: 8658 }, { f: '008.jpg', w: 5792, h: 8688 },
      { f: '009.jpg', w: 5291, h: 7936 }, { f: '010.jpg', w: 8685, h: 5790 },
      { f: '011.jpg', w: 5792, h: 8688 }, { f: '012.jpg', w: 8688, h: 5792 },
      { f: '013.jpg', w: 8682, h: 5788 }, { f: '014.jpg', w: 8682, h: 5788 },
      { f: '015.jpg', w: 8682, h: 5788 }, { f: '016.jpg', w: 5792, h: 8688 },
      { f: '017.jpg', w: 5792, h: 8688 }, { f: '018.jpg', w: 8688, h: 5792 },
      { f: '019.jpg', w: 7124, h: 4749 }, { f: '020.jpg', w: 9504, h: 6336 },
      { f: '021.jpg', w: 4711, h: 6201 }, { f: '022.jpg', w: 8450, h: 5633 },
      { f: '023.jpg', w: 14589, h: 10282 }
    ],
    mainGallery: null, // null = show all
    carousels: [
      {
        title: 'CMY/K Lightbox Studies',
        meta: 'process separation details',
        desc: 'Close studies of the two-layer CMY/K process separation technique \u2014 examining the interplay between transparent inks and transmitted light that gives each lightbox its color depth.',
        indices: [6, 7, 8, 10, 15, 16]
      },
      {
        title: 'Installation Views',
        meta: 'exhibition documentation',
        desc: 'Documentation of the work installed in gallery settings, showing how the lightboxes interact with architectural space and ambient light conditions.',
        indices: [18, 19, 20, 21, 22]
      }
    ]
  },

  'recalibration': {
    title: 'Recalibration',
    year: '2024',
    medium: 'Photography',
    description: 'Recalibration proposes a resetting of perceptual instruments \u2014 both mechanical and cognitive. The series traces moments where established systems of measurement and observation encounter their own limits, producing images that function less as documentation than as recalibrations of attention. Each photograph suspends the viewer between what is seen and what is assumed, asking how we might look again at structures we have already agreed to understand.',
    ogDesc: 'Photography \u2014 2024',
    prev: { slug: 'as-light-turns-into-day', title: 'As Light Turns Into Day' },
    next: { slug: 'melted-plastic', title: 'Melted Plastic' },
    images: [
      { f: '001.jpg', w: 2000, h: 3000 }, { f: '002.jpg', w: 3000, h: 2000 },
      { f: '003.jpg', w: 2000, h: 3000 }, { f: '004.jpg', w: 2000, h: 3000 },
      { f: '005.jpg', w: 2000, h: 3000 }, { f: '006.jpg', w: 3000, h: 2000 },
      { f: '007.jpg', w: 3000, h: 2000 }, { f: '008.jpg', w: 3000, h: 2045 },
      { f: '009.jpg', w: 2111, h: 3000 }, { f: '010.jpg', w: 3000, h: 2114 },
      { f: '011.jpg', w: 3000, h: 2045 }, { f: '012.jpg', w: 2684, h: 3000 },
      { f: '013.jpg', w: 3000, h: 2160 }, { f: '014.jpg', w: 3000, h: 2045 }
    ],
    mainGallery: null,
    carousels: [
      {
        title: 'Structural Studies',
        meta: 'geometric + architectural forms',
        desc: 'Photographs isolating the geometric and structural elements that calibration systems rely on \u2014 grids, edges, and measured surfaces that both organize and limit perception.',
        indices: [0, 2, 3, 4, 8, 11]
      },
      {
        title: 'Surface + Reflection',
        meta: 'material encounters',
        desc: 'Images where surfaces become instruments of recalibration \u2014 industrial materials and repeated forms that absorb, reflect, and redistribute attention.',
        indices: [1, 5, 6, 7, 9, 10, 13]
      }
    ]
  },

  'melted-plastic': {
    title: 'Melted Plastic',
    year: '2025',
    medium: 'Photography, Material Investigation',
    description: 'Melted Plastic follows the transformation of synthetic material under heat and pressure, tracing the point where industrial product returns to an undifferentiated state. The work treats plastic not as waste but as a medium whose deformation reveals the forces that shaped it \u2014 manufacturing processes made legible through their undoing. Each image holds the tension between what the material was designed to be and what it becomes when those designs are released.',
    ogDesc: 'Photography, Material Investigation \u2014 2025',
    prev: { slug: 'recalibration', title: 'Recalibration' },
    next: { slug: 'on-the-impossibility-of-a-unified-geodesy', title: 'On the Impossibility of a Unified Geodesy' },
    images: [
      { f: '1.jpg', w: 6025, h: 4820 }, { f: '2.jpg', w: 9504, h: 6336 },
      { f: '3.jpg', w: 6336, h: 9504 }, { f: '4.jpg', w: 9504, h: 6336 },
      { f: '5.jpg', w: 6336, h: 9504 }, { f: '6.jpg', w: 6336, h: 9504 },
      { f: '7.jpg', w: 6336, h: 9504 }, { f: '8.jpg', w: 9504, h: 6336 },
      { f: '9.jpg', w: 9504, h: 6336 }, { f: '10.jpg', w: 9150, h: 6100 },
      { f: '11.jpg', w: 6336, h: 9504 }, { f: '12.jpg', w: 6336, h: 9504 },
      { f: '13.jpg', w: 7920, h: 6336 }, { f: '14.jpg', w: 6336, h: 9504 }
    ],
    mainGallery: null,
    carousels: [
      {
        title: 'Deformation Studies',
        meta: 'heat + pressure transformations',
        desc: 'Close examinations of plastic surfaces undergoing thermal transformation \u2014 capturing the moment industrial form gives way to an undirected materiality.',
        indices: [0, 2, 4, 5, 6, 10, 11]
      },
      {
        title: 'Light + Translucency',
        meta: 'optical material properties',
        desc: 'Studies of how melted and deformed plastic interacts with light \u2014 translucent layers, refractions, and the optical qualities revealed through material transformation.',
        indices: [1, 3, 7, 8, 9, 12, 13]
      }
    ]
  },

  'on-the-impossibility-of-a-unified-geodesy': {
    title: 'On the Impossibility of a Unified Geodesy',
    year: '2024',
    medium: 'Photography, Installation, Research',
    description: 'This capstone project examines the impossibility of representing the earth\u2019s surface through any single coordinate system. Drawing from the history of geodesy \u2014 the science of measuring and representing the earth \u2014 the work interrogates the assumptions embedded in every map, survey, and satellite image. The project reveals how our tools of spatial representation carry forward the biases and limitations of the cultures that built them, proposing that every act of measurement is also an act of interpretation.',
    ogDesc: 'Photography, Installation, Research \u2014 2024',
    prev: { slug: 'melted-plastic', title: 'Melted Plastic' },
    next: { slug: 'content-in-place', title: 'Content in Place' },
    images: [
      { f: '1.jpg', w: 8959, h: 5973 }, { f: '2.jpg', w: 9504, h: 6336 },
      { f: '3.jpg', w: 9265, h: 6177 }, { f: '4.jpg', w: 6303, h: 4202 },
      { f: '5.jpg', w: 7057, h: 4705 }, { f: '6.jpg', w: 9504, h: 6336 },
      { f: '7.jpg', w: 4224, h: 5280 }, { f: '8.jpg', w: 4251, h: 5314 },
      { f: '9.jpg', w: 3977, h: 4971 }, { f: '10.jpg', w: 5879, h: 7349 },
      { f: '11.jpg', w: 5879, h: 7349 }, { f: '12.jpg', w: 5073, h: 7609 },
      { f: '13.jpg', w: 2922, h: 5658 }, { f: '14.jpg', w: 3598, h: 2399 },
      { f: '15.jpg', w: 6777, h: 4518 }
    ],
    mainGallery: null,
    carousels: [
      {
        title: 'Mapping + Projection',
        meta: 'cartographic investigations',
        desc: 'Investigations into the distortions inherent to cartographic projection \u2014 how every attempt to flatten the earth\u2019s surface onto a plane introduces systematic biases and omissions.',
        indices: [0, 2, 3, 4, 5, 14]
      },
      {
        title: 'Field + Installation',
        meta: 'spatial documentation',
        desc: 'Documentation of the project in landscape and gallery contexts \u2014 survey instruments in the field and projected maps in installation, bridging measurement and interpretation.',
        indices: [6, 7, 8, 9, 10, 11, 12, 13]
      }
    ]
  },

  'confidence-threshold': {
    title: 'Confidence Threshold',
    year: '2023',
    medium: 'Photography',
    description: 'Confidence Threshold interrogates the point at which accumulated visual evidence becomes sufficient for belief. The work examines the mechanisms \u2014 statistical, perceptual, institutional \u2014 by which photographic images cross from uncertainty into accepted truth. Each piece in the series occupies the margin where data has not yet become knowledge, where the image is still negotiating its own credibility.',
    ogDesc: 'Photography \u2014 2023',
    prev: { slug: 'pseudo-data', title: 'Pseudo-Data' },
    next: null,
    images: [
      { f: '1.png', w: 3367, h: 5657 }, { f: '2.png', w: 3368, h: 5657 },
      { f: '3.png', w: 3368, h: 5657 }, { f: '4.png', w: 3367, h: 5657 },
      { f: '5.png', w: 3367, h: 5657 }, { f: '6.png', w: 3367, h: 5657 },
      { f: '7.png', w: 3367, h: 5657 }, { f: '8.png', w: 3367, h: 5657 },
      { f: '9.png', w: 3367, h: 5657 }, { f: '10.png', w: 3367, h: 5657 },
      { f: '11.png', w: 3367, h: 5657 }, { f: '12.png', w: 3367, h: 5657 },
      { f: '13.png', w: 3367, h: 5657 }, { f: '14.png', w: 3367, h: 5657 },
      { f: '15.png', w: 3367, h: 5657 }, { f: '16.png', w: 3367, h: 5657 },
      { f: '17.png', w: 3367, h: 5657 }, { f: '18.png', w: 3367, h: 5657 },
      { f: '19.png', w: 3367, h: 5657 }, { f: '20.png', w: 3367, h: 5657 },
      { f: '21.png', w: 3367, h: 5657 }, { f: '22.png', w: 3367, h: 5657 },
      { f: '23.png', w: 3367, h: 5657 }, { f: '24.png', w: 3367, h: 5657 },
      { f: '25.png', w: 12000, h: 17997 }, { f: '26.png', w: 12000, h: 18546 },
      { f: '27.png', w: 12000, h: 17953 }
    ],
    mainGallery: null,
    carousels: [
      {
        title: 'Perceptual Boundaries',
        meta: 'threshold studies',
        desc: 'Studies that isolate the moment where accumulated visual information begins to coalesce into belief \u2014 graduated tones and subtle shifts that mark the boundary between uncertainty and conviction.',
        indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      },
      {
        title: 'Institutional Markers',
        meta: 'verification + credibility',
        desc: 'Images examining the institutional mechanisms that confer credibility \u2014 the marks, stamps, and visual codes by which photographic evidence crosses from ambiguity into accepted fact.',
        indices: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
      }
    ]
  },

  'pseudo-data': {
    title: 'Pseudo-Data',
    year: '2023',
    medium: 'Photography, Digital Process',
    description: 'Pseudo-Data occupies the space between information and fabrication, producing images that adopt the visual language of empirical evidence while undermining its authority. The work generates photographic material that resembles data \u2014 measured, indexed, verifiable \u2014 but whose referents remain uncertain. Each image operates as a proposition about the conditions under which we accept visual information as true, testing the threshold where documentation becomes fiction.',
    ogDesc: 'Photography, Digital Process \u2014 2023',
    prev: { slug: 'constant-energy', title: 'Constant Energy' },
    next: { slug: 'confidence-threshold', title: 'Confidence Threshold' },
    images: Array.from({ length: 39 }, (_, i) => ({
      f: String(i + 1).padStart(3, '0') + '.jpg', w: 3000, h: 1941
    })),
    mainGallery: null,
    carousels: [
      {
        title: 'Systematic Surfaces',
        meta: 'grid + index structures',
        desc: 'Images that adopt the formal language of empirical data \u2014 systematic grids, measured overlays, and indexed surfaces that mimic the authority of scientific documentation.',
        indices: Array.from({ length: 20 }, (_, i) => i)
      },
      {
        title: 'Process Artifacts',
        meta: 'digital fabrication',
        desc: 'Works that foreground the digital processes by which pseudo-evidence is generated \u2014 the artifacts and residues of fabrication made visible as subject matter.',
        indices: Array.from({ length: 19 }, (_, i) => i + 20)
      }
    ]
  }
};

function imgBlock(slug, img, indent) {
  const p = ' '.repeat(indent);
  const th = Math.round(40 * img.h / img.w);
  return `${p}<div class="image-container">
${p}  <img class="image-container__thumb"
${p}       src="${CDN}/projects/${slug}/thumb/${img.f}"
${p}       alt="" aria-hidden="true" width="40" height="${th}">
${p}  <img class="image-container__full"
${p}       data-src="/projects/${slug}/full/${img.f}"
${p}       alt=""
${p}       width="${img.w}" height="${img.h}" loading="lazy">
${p}</div>`;
}

function genPage(slug, p) {
  const allIndices = p.mainGallery || Array.from({ length: p.images.length }, (_, i) => i);
  const mainImgs = allIndices.map(i => imgBlock(slug, p.images[i], 6)).join('\n\n');

  let carouselHTML = '';
  for (const c of p.carousels) {
    const cImgs = c.indices.map(i => imgBlock(slug, p.images[i], 8)).join('\n');
    carouselHTML += `
    <!-- Piece-specific carousel -->
    <section class="piece-carousel">
      <header class="piece-carousel__header">
        <h2>${c.title}</h2>
        <p class="piece-carousel__meta">${c.meta}</p>
      </header>
      <div class="piece-carousel__description">
        <p>${c.desc}</p>
      </div>
      <div class="piece-carousel__images">
${cImgs}
      </div>
    </section>
`;
  }

  const navAttrs = [];
  if (p.prev) navAttrs.push(`data-prev-project="${p.prev.slug}.html"`);
  if (p.next) navAttrs.push(`data-next-project="${p.next.slug}.html"`);
  const navLinks = [];
  if (p.prev) navLinks.push(`      <a href="${p.prev.slug}.html">&larr; ${p.prev.title}</a>`);
  if (p.next) navLinks.push(`      <a href="${p.next.slug}.html">${p.next.title} &rarr;</a>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.title} \u2014 Beck Andersen</title>
  <meta name="description" content="${p.description.substring(0, 160)}">
  <meta property="og:title" content="${p.title} \u2014 Beck Andersen">
  <meta property="og:description" content="${p.ogDesc}">
  <meta property="og:image" content="${CDN}/projects/${slug}/full/${p.images[0].f}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="../css/variables.css">
  <link rel="stylesheet" href="../css/base.css">
  <link rel="stylesheet" href="../css/components.css">
  <link rel="stylesheet" href="../css/pages.css">
</head>
<body>
  <nav class="site-nav" role="navigation" aria-label="Main navigation">
    <a class="site-nav__name" href="../index.html">beck andersen</a>
    <button class="site-nav__toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">
      <span class="site-nav__toggle-icon"></span>
    </button>
    <div class="site-nav__links" id="nav-links">
      <a href="../index.html" class="active">work</a>
      <a href="../gallery.html">gallery</a>
      <a href="../point-clouds.html">point clouds</a>
      <a href="../about.html">about</a>
    </div>
  </nav>

  <main class="project-page">
    <header class="project-page__header">
      <h1 class="project-page__title">${p.title}</h1>
      <p class="project-page__year">${p.year}</p>
      <p class="project-page__medium">${p.medium}</p>
    </header>

    <div class="project-page__description">
      <p>${p.description}</p>
    </div>

    <div class="project-page__images">
${mainImgs}
    </div>
${carouselHTML}
    <nav class="project-page__nav" aria-label="Project navigation"
         ${navAttrs.join('\n         ')}>
${navLinks.join('\n')}
    </nav>
  </main>

  <footer class="site-footer">
    <div class="site-footer__links">
      <a href="mailto:contact@beckandersen.com">email</a>
      <a href="https://instagram.com/beckandersen" target="_blank" rel="noopener noreferrer">instagram</a>
    </div>
    <p>&copy; 2025 Beck Andersen</p>
  </footer>

  <script>
    document.querySelector('.site-nav__toggle')?.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      document.getElementById('nav-links').classList.toggle('is-open');
    });
  </script>
  <script type="module" src="../js/image-loader.js"></script>
  <script type="module" src="../js/lightbox.js"></script>
  <script type="module" src="../js/project-template.js"></script>
</body>
</html>
`;
}

// Generate and write all pages
Object.entries(projects).forEach(([slug, data]) => {
  const html = genPage(slug, data);
  const outPath = 'projects/' + slug + '.html';
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`Wrote ${outPath} (${html.length} bytes, ${data.images.length} images)`);
});

console.log('\nDone! 6 project pages updated with real bucket images + thumbnails.');
