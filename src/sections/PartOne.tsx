import { useEffect, useMemo, useRef } from 'react';
import { Figure, Scope, Term } from '../components/Figure';
import type { FigureHandle } from '../components/Figure';
import { Chapter, Note, Prose, ScrollScene } from '../components/layout';
import type { Step } from '../components/layout';
import { setupDecap, setupEtch, setupHero, setupLineage, setupNano, setupPackages } from '../three/scenes';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const fig = useRef<FigureHandle>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      fig.current?.set({ explode: Math.min(1, p / 0.82) });
      pin.current?.style.setProperty('--p', p.toFixed(3));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, []);

  const bits = useMemo(() => {
    let a = 2005;
    const line = () =>
      Array.from({ length: 34 }, () => {
        a = (a * 1103515245 + 12345) >>> 0;
        return (a >>> 8).toString(2).padStart(24, '0').slice(0, 8);
      }).join(' ');
    return [line(), line(), line()];
  }, []);

  return (
    <header className="hero" id="top" ref={section}>
      <div className="hero-pin" ref={pin}>
        <div className="hero-bits" aria-hidden="true">
          {bits.map((b) => (
            <div key={b}>{b}</div>
          ))}
        </div>
        <div className="hero-copy">
          <p className="tag">
            <b>Special</b>
            <span>Board Field Guide</span>
          </p>
          <h1>
            <span className="h1-top">Evolution of</span>
            <span className="h1-main">Arduino</span>
          </h1>
          <p className="hero-lede">
            Nine years, some thirty boards and seven microcontrollers: from a serial-port kit for design students to a
            32-bit ARM machine. Every board on this page is a model you can pick up. Scroll, and this one comes apart.
          </p>
        </div>
        <div className="hero-stage">
          <Figure
            ref={fig}
            fill
            setup={setupHero}
            label="Arduino Uno"
            view={{ yaw: -0.5, pitch: 0.95, radius: 48 }}
            params={{ explode: 0 }}
          />
          <p className="hero-cap">
            <span className="cap-a">
              <span className="cue" aria-hidden="true" />
              Scroll to take it apart
            </span>
            <span className="cap-b">Arduino Uno · 2010 · 68.6 × 53.4 mm</span>
          </p>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* 01 · Ivrea                                                          */
/* ------------------------------------------------------------------ */

export function Origins() {
  return (
    <Chapter id="origins" n="01" years="2005" year={2005} title="A board named after a bar">
      <Prose>
        <Note>
          In 2005, a group at Italy’s Interaction Design Institute Ivrea developed Arduino as a low-cost, easy-to-use
          electronics platform for students and artists.
        </Note>
        <p>
          The students in question were designers, not engineers. They wanted a lamp that reacted to a hand, a chair
          that knew it was being sat on. The microcontroller boards of the day were priced for engineering departments
          and documented for them too. So five people — Massimo Banzi, David Cuartielles, Tom Igoe, Gianluca Martino
          and David Mellis — built on an earlier student project called Wiring and made the board they wished they
          could hand out.
        </p>
        <p>
          It borrows its name from a nearby watering hole, Bar di Re Arduino, itself named for a local nobleman who
          was king of Italy a thousand years earlier.
        </p>
        <p>
          The decision that mattered most wasn’t electrical. Schematics, board layouts and software were all
          published, free to copy and change. Anyone could build an Arduino, improve one or sell one, and soon a great
          many people did.
        </p>
        <Note>
          Since exploding onto the maker scene, Arduino has cultivated a flourishing community of inventors, engineers,
          and hackers dedicated to sharing code and developing hardware under an open-source banner.
        </Note>
        <p>
          What follows is the hardware side of that story. Each figure is live: drag it to turn it around, and where
          there is a slider, pull it. Words <span className="term is-static">marked like this</span> point at part of
          a model when you hover or tap them.
        </p>
      </Prose>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Etch it yourself                                               */
/* ------------------------------------------------------------------ */

export function Etch() {
  return (
    <Chapter id="etch" n="02" years="2005 → 2008" year={2005} title="Print it, iron it, etch it">
      <Prose>
        <p>
          If the design is open, you don’t need to buy the board at all. The <strong>Single-Sided Serial</strong> took
          that literally.
        </p>
        <Note>Designed to be built on a home-etched PCB.</Note>
        <p>
          A factory board routes copper on both faces and connects them with plated holes. A kitchen can’t do that, so
          this layout squeezes every connection onto one face, with fat traces that survive a clumsy etch. You start
          with a blank sheet clad in copper. The circuit is laser-printed in black toner and ironed on; toner is
          plastic, and acid can’t get through it.
        </p>
      </Prose>
      <Figure
        setup={setupEtch}
        label="Single-sided serial board, copper side"
        view={{ yaw: -0.35, pitch: -0.95, box: [52, 40] }}
        aspect={0.6}
        controls={[
          { key: 'etch', label: 'Etch', initial: 0, color: 'var(--copper)', format: pct },
          { key: 'populate', label: 'Populate', initial: 0, color: 'var(--teal)', format: pct },
        ]}
        caption={
          <>
            Pull <b>Etch</b>: the bare copper dissolves and only what the toner protected survives. At the very end the
            toner is scrubbed off and the circuit appears. Then pull <b>Populate</b>: the board turns over and the
            parts go in, shortest first, the way you would solder them.
          </>
        }
      />
      <Prose>
        <p>
          Flip the finished board over yourself and you’ll see the legs of every part poking through to the copper
          they are soldered to. That is the whole trick of through-hole construction, and the reason the first
          Arduinos could be assembled at home with a basic soldering iron.
        </p>
        <p>
          The home-made branch of the family kept going long after the official boards moved on. It peaked in 2008
          with the <strong>Severino</strong>, also known as the S3V3.
        </p>
        <Note>Most advanced etch-it-yourself PCB design.</Note>
      </Prose>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Lineage                                                        */
/* ------------------------------------------------------------------ */

const NAMES: [string, string][] = [
  ['Serial', '2005'],
  ['USB', '2005'],
  ['Extreme', '2006'],
  ['NG', '2006'],
  ['Diecimila', '2007'],
  ['Duemilanove', '2008'],
];

const lineage: Step[] = [
  {
    year: 2005,
    kicker: '2005',
    title: 'Serial',
    body: (
      <>
        <p>
          The first Arduino has no USB port. A nine-pin <Term part="usb">RS-232 socket</Term>, the kind that once
          served modems and mice, takes up a fifth of the board.
        </p>
        <Note>Old-style RS-232 serial port rather than USB.</Note>
        <p>
          Everything stands on legs: the <Term part="mcu">ATmega8</Term> in its socket, an upright{' '}
          <Term part="power">voltage regulator</Term>, a <Term part="crystal">16 MHz crystal</Term>. The rows of holes
          along the edges are left bare for you to solder in whatever the project needs.
        </p>
      </>
    ),
  },
  {
    year: 2005,
    kicker: '2005',
    title: 'USB',
    body: (
      <>
        <Note>First board to bear the Arduino name.</Note>
        <p>
          The serial socket gives way to a square <Term part="usb">USB-B jack</Term>. Behind it sits a new passenger,
          an <Term part="bridge">FTDI chip</Term> whose only job is to make USB look like the old serial port, so
          nothing else has to change.
        </p>
        <p>
          The same cable now carries power. A little jumper next to the regulator chooses between it and the{' '}
          <Term part="jack">barrel jack</Term>.
        </p>
      </>
    ),
  },
  {
    year: 2006,
    kicker: '2006',
    title: 'Extreme',
    body: (
      <>
        <Note>Adds female pin headers, data transfer LEDs.</Note>
        <p>
          The Extreme arrives with <Term part="headers">socket strips</Term> already soldered along both edges. A
          jumper wire pushes straight in. No iron, no commitment. It is the single most important thing about how an
          Arduino feels to use.
        </p>
        <p>
          Two <Term part="leds">LEDs</Term> now flicker whenever bytes move. And look at the small parts: most have
          lost their legs and shrunk to surface-mount specks.
        </p>
      </>
    ),
  },
  {
    year: 2006,
    kicker: '2006',
    title: 'NG',
    body: (
      <>
        <p>
          <em>Nuova Generazione</em>. A newer <Term part="bridge">FTDI chip</Term> in a long, narrow package needs far
          fewer supporting parts. And a third <Term part="leds">LED</Term> appears, wired to pin 13: the one that
          every first program will blink.
        </p>
        <p>A later run, the NG+, changed the brain:</p>
        <Note>First to ship with ATmega168.</Note>
      </>
    ),
  },
  {
    year: 2007,
    kicker: '2007',
    title: 'Diecimila',
    body: (
      <>
        <p>
          <em>Ten thousand</em>, for the number of boards made so far. Its best trick is invisible. Until now,
          uploading a program meant pressing <Term part="reset">the reset button</Term> at just the right moment. The
          Diecimila lets the computer do it over USB.
        </p>
        <p>You click Upload, and it uploads.</p>
      </>
    ),
  },
  {
    year: 2008,
    kicker: '2008',
    title: 'Duemilanove',
    body: (
      <>
        <Note>Auto-selects power supply. First to ship with ATmega328.</Note>
        <p>
          <em>Two thousand and nine</em>. The power jumper is gone: the board works out for itself whether to draw from{' '}
          <Term part="usb">USB</Term> or the <Term part="jack">jack</Term>.
        </p>
        <p>
          Later units carry a new <Term part="mcu">ATmega328</Term> in the same socket, same pins, twice the memory.
          Which raises the question of what is actually inside that black rectangle.
        </p>
      </>
    ),
  },
];

export function Lineage() {
  return (
    <Chapter id="lineage" n="03" years="2005 → 2008" title="One silhouette, six boards">
      <Prose year={2005}>
        <p>
          While hobbyists etched, the official line was changing fast. Keep an eye on the outline as you scroll,
          because it barely moves. What changes is everything standing on it.
        </p>
      </Prose>
      <ScrollScene
        steps={lineage}
        stage={(active) => (
          <>
            <Figure
              fill
              setup={setupLineage}
              label={`Arduino ${NAMES[active][0]}, ${NAMES[active][1]}`}
              view={{ yaw: -0.4, pitch: 0.92, radius: 48 }}
              params={{ step: active }}
            />
            <p className="stage-label" aria-hidden="true">
              <span>{NAMES[active][1]}</span>
              <b>{NAMES[active][0]}</b>
            </p>
          </>
        )}
      />
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · The chip                                                       */
/* ------------------------------------------------------------------ */

export function Chip() {
  return (
    <Chapter id="chip" n="04" years="ATmega8 → 168 → 328" year={2008} title="The black centipede">
      <Scope>
        <Prose>
          <Note>Atmel’s 8-bit megaAVR microcontroller family is an Arduino signature.</Note>
          <p>
            A microcontroller is a whole computer in one package: processor, program storage, working memory and the
            circuits that talk to the outside world. The package is mostly packaging. Lift the lid and keep going.
          </p>
        </Prose>
        <Figure
          setup={setupDecap}
          label="ATmega328 in a 28-pin dual in-line package, opened"
          view={{ yaw: -0.3, pitch: 0.9, radius: 21 }}
          aspect={0.56}
          controls={[{ key: 'open', label: 'Open', initial: 0, color: 'var(--gold)', format: pct }]}
          caption={
            <>
              The first half of the slider lifts the epoxy. The second half flies you down to the silicon: a square
              about three millimetres across, tied to its 28 legs by gold wires thinner than a hair.
            </>
          }
        />
        <Prose>
          <p>
            Most of that square is memory. <Term part="flash">Flash</Term> holds your program and keeps it with the
            power off. <Term part="sram">SRAM</Term> is the scratch space the program works in, and it is tiny.{' '}
            <Term part="eeprom">EEPROM</Term> stores the few settings that should survive a restart. The{' '}
            <Term part="cpu">processor</Term> itself, the part that does the computing, takes up a corner.
          </p>
          <p>The story of the classic Arduino is largely the story of that flash block growing.</p>
          <Note>
            The ATmega168 doubles on-board memory to 16KB, but is otherwise nearly identical to the ATmega8.
          </Note>
          <Note>On-chip memory doubles again to 32KB.</Note>
          <p>
            Same package, same pinout, every time. Because the chip sat in a socket, upgrading an old board could be
            as simple as prying one centipede out and pressing another in.
          </p>
        </Prose>
      </Scope>

      <Prose>
        <h3 style={{ marginTop: '2.2em' }}>Same chip, three suits</h3>
        <p>
          The silicon doesn’t care what it is wrapped in. The same ATmega328 was sold in three packages, and which one
          a board uses tells you how it was meant to be built.
        </p>
      </Prose>
      <Figure
        setup={setupPackages}
        label="PDIP-28, TQFP-32 and VQFN-32 packages at the same scale"
        view={{ yaw: -0.25, pitch: 0.95, box: [36, 14.5] }}
        aspect={0.46}
        controls={[{ key: 'flip', label: 'Flip', initial: 0, color: 'var(--blue)', format: (v) => `${Math.round(v * 180)}°` }]}
        caption="All three are drawn to the same scale. Flip them: the smallest has no legs at all."
      />
      <Prose>
        <Note>Large 28-pin Plastic Dual In-line Package (PDIP-28) for through-hole soldering.</Note>
        <Note>Thin Quad Flat Package (TQFP) designed for surface-mount soldering.</Note>
        <Note>Very thin Quad Flat No-lead (VQFN) package replaces leads with underside pads.</Note>
        <p>
          The DIP is forgiving and enormous. Once you give up on hand assembly and let a machine place the parts, the
          computer shrinks to the size of a lentil, and the board can shrink with it.
        </p>
      </Prose>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Small boards                                                   */
/* ------------------------------------------------------------------ */

export function Small() {
  return (
    <Chapter id="small" n="05" years="Mini · Nano · Pro · Fio" year={2008} title="Shrinking the board">
      <Scope>
        <Prose>
          <p>
            The <strong>Mini</strong> went first, trading the socketed DIP for a chip soldered flat to the board.
          </p>
          <Note>First board to use surface-mount processor.</Note>
          <p>
            The <strong>Nano</strong> kept the idea and brought the USB port back. Its{' '}
            <Term part="mcu">processor</Term> sits at a jaunty 45°, a <Term part="usb">mini-USB socket</Term> hangs
            off one end, and the connections have moved somewhere new.
          </p>
          <Note>Underside pins for breadboard connection.</Note>
        </Prose>
        <Figure
          setup={setupNano}
          label="Arduino Nano above a solderless breadboard"
          view={{ yaw: -0.5, pitch: 0.8, box: [50, 36] }}
          aspect={0.58}
          controls={[{ key: 'seat', label: 'Press in', initial: 0, color: 'var(--teal)', format: pct }]}
          caption={
            <>
              Thirty pins, two rows, spaced to straddle the groove down the middle of a breadboard. Press it in and
              every pin gets a row of holes of its own.
            </>
          }
        />
        <Prose>
          <p>
            Turn the model over while it hovers and you’ll see the <Term part="pins">pins</Term>. On the big boards
            you bring wires to the Arduino. Here the Arduino goes to the wires and becomes one more component in the
            circuit.
          </p>
          <p>The rest of the small family each gave something up on purpose.</p>
          <Note label="Pro">Designed for semipermanent installation.</Note>
          <Note label="Pro Mini">Mini form-factor compatible.</Note>
          <Note label="Fio">Designed for battery-powered wireless projects.</Note>
          <p>
            The Pro ships without headers because it expects to be soldered into something and left there. The Fio
            adds a battery connector and a radio socket and drops nearly everything else. The Bluetooth board replaces
            the cable entirely. By 2009 “an Arduino” no longer meant one shape.
          </p>
        </Prose>
      </Scope>
    </Chapter>
  );
}
