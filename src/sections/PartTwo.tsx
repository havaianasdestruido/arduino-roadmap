import { useState } from 'react';
import { Figure, Scope, Term } from '../components/Figure';
import { Chapter, Note, Prose, Readout, ScrollScene, blinkStore } from '../components/layout';
import type { Step } from '../components/layout';
import {
  TIER_COLORS,
  setupAnatomy,
  setupBlink,
  setupLily,
  setupMemory,
  setupShield,
  setupSwap,
} from '../three/scenes';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/* ------------------------------------------------------------------ */
/* 06 · LilyPad                                                        */
/* ------------------------------------------------------------------ */

export function Lily() {
  return (
    <Chapter id="lilypad" n="06" years="2007 → 2012" year={2009} title="A circuit you can sew">
      <Scope>
        <Prose>
          <p>
            Every board so far assumes a workbench. The <strong>LilyPad</strong>, designed by Leah Buechley, assumes a
            sewing basket. It is round so it won’t snag, thin so it won’t show, and its connections are neither pins
            nor sockets.
          </p>
          <Note>Sew-through contact pads for connecting conductive thread.</Note>
          <p>
            Each gold <em>petal</em> is a plated hole. Stitch through it a few times with thread spun from steel and
            you have made a solder joint with a needle. The thread is the wire.
          </p>
        </Prose>
        <Figure
          setup={setupLily}
          label="LilyPad Arduino and a sewable LED on fabric"
          view={{ yaw: -0.2, pitch: 0.95, box: [64, 40] }}
          aspect={0.58}
          controls={[{ key: 'sew', label: 'Sew', initial: 0, color: 'var(--purple)', format: pct }]}
          caption={
            <>
              Two runs of stitches: one from petal 13 to the LED’s positive pad, one back from its negative pad to
              ground. Nothing happens until the second run lands, because a circuit has to be a circle.
            </>
          }
        />
        <Prose>
          <p>
            In the middle sits the same <Term part="mcu">ATmega</Term> as the Nano, in the same flat package. The
            family grew in its own direction: the LilyPad Simple cut the petal count and added a battery socket, and
            the LilyPad USB later did away with the programming adapter.
          </p>
          <Note label="LilyPad Simple Snap">Replaces sew-through contacts with button snaps.</Note>
          <p>Snap the computer off, put the shirt in the wash, snap it back on.</p>
        </Prose>
      </Scope>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* Meanwhile                                                           */
/* ------------------------------------------------------------------ */

export function Milestones() {
  return (
    <div className="miles" aria-label="Meanwhile, off the board">
      <div data-year={2009}>
        <span className="yr">2009</span>
        <p className="big">On the air</p>
        <p>Co-founder Banzi interviewed on TWiT.</p>
      </div>
      <div>
        <span className="yr">2010</span>
        <p className="big">The IDE takes off</p>
        <p>Arduino IDE begins rapid development.</p>
      </div>
      <div>
        <span className="yr">2011</span>
        <p className="big">300,000</p>
        <p>Arduinos “in the wild”.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 07 · Uno                                                            */
/* ------------------------------------------------------------------ */

const unoSteps: Step[] = [
  {
    year: 2010,
    kicker: '2010',
    title: 'Uno',
    body: (
      <>
        <p>
          <em>One</em>. After five years of revisions the classic board is declared finished enough to name the
          software after: Arduino 1.0. The mask turns teal, the lettering gets tidy, and the layout is frozen.
        </p>
        <Note>Official reference model for Arduino platform.</Note>
        <p>From here on, “Arduino-compatible” means compatible with this.</p>
      </>
    ),
  },
  {
    year: 2010,
    kicker: 'USB',
    title: 'A second computer, just for the cable',
    body: (
      <>
        <p>
          The FTDI chip is gone. In its place, right behind the <Term part="usb">USB jack</Term>, is{' '}
          <Term part="bridge">another Atmel microcontroller</Term>, turned 45° and programmed to do nothing but
          translate USB.
        </p>
        <p>
          Because it is a computer and not a fixed-function part, it can be reprogrammed to make the whole board
          pretend to be something else. Hold that thought until the Leonardo.
        </p>
      </>
    ),
  },
  {
    year: 2010,
    kicker: 'Brain',
    title: 'ATmega328P',
    body: (
      <>
        <p>
          <Term part="mcu">The centipede</Term>, still in its socket: 32 KB for your program, 2 KB to think in, and
          twenty legs wired straight out to the edge of the board.
        </p>
        <p>If you ever cook one, a replacement pushes in by hand.</p>
      </>
    ),
  },
  {
    year: 2010,
    kicker: 'Clock',
    title: 'Sixteen million ticks a second',
    body: (
      <p>
        The silver can is a <Term part="crystal">quartz crystal</Term>, a sliver of rock that rings at exactly
        16 MHz. Every instruction the processor runs is paced by it. It is why <code>delay(1000)</code> lasts a second
        and not roughly a second.
      </p>
    ),
  },
  {
    year: 2010,
    kicker: 'Pins',
    title: 'The famous gap',
    body: (
      <>
        <p>
          Four <Term part="headers">socket strips</Term>: fourteen digital pins along the top, power and six analog
          inputs along the bottom.
        </p>
        <p>
          Look closely at the top row. The two strips are not on the same 0.1-inch grid; there is an odd 0.16-inch gap
          between them. It began as a layout slip on the earliest boards. By the time anyone might have fixed it,
          hundreds of add-on boards depended on it, so it stayed, and it has been in every revision since.
        </p>
      </>
    ),
  },
  {
    year: 2010,
    kicker: 'Power',
    title: 'Two ways in',
    body: (
      <p>
        A <Term part="jack">barrel jack</Term> takes anything from a wall adapter to a 9 V battery, and a{' '}
        <Term part="power">regulator and two capacitors</Term> flatten it to a steady 5 V. Plug in USB as well and the
        board quietly picks whichever is better.
      </p>
    ),
  },
  {
    year: 2010,
    kicker: 'All of it',
    title: 'Now take it apart',
    body: (
      <p>
        Pull the <b>Explode</b> slider under the model. A few dozen parts, one board, and nothing on it that you
        couldn’t name by now.
      </p>
    ),
  },
];

const toDelay = (s: number) => Math.round((50 * Math.pow(40, s)) / 10) * 10;

export function Uno() {
  const [delay, setDelay] = useState(1000);
  return (
    <Chapter id="uno" n="07" years="2010" year={2010} title="Uno">
      <ScrollScene
        steps={unoSteps}
        stage={(active) => (
          <Figure
            fill
            setup={setupAnatomy}
            label="Arduino Uno, annotated"
            view={{ yaw: -0.45, pitch: 0.95, radius: 47 }}
            params={{ step: active }}
            controls={[{ key: 'explode', label: 'Explode', initial: 0, color: 'var(--hot)', format: pct }]}
          />
        )}
      />
      <Prose year={2010}>
        <h3 style={{ marginTop: '1.5em' }}>Hello, world</h3>
        <p>
          A new Uno arrives already running a program. It is called Blink, it is the first thing nearly everyone
          changes, and it is the whole Arduino idea in miniature: five lines, one upload, and an object on your desk
          is doing what you told it to.
        </p>
      </Prose>
      <Figure
        setup={setupBlink}
        label="Arduino Uno running the Blink sketch"
        view={{ yaw: 0.25, pitch: 1.02, box: [41, 31] }}
        aspect={0.56}
        controls={[
          {
            key: 's',
            label: 'delay()',
            initial: Math.log(1000 / 50) / Math.log(40),
            color: 'var(--hot)',
            format: (v) => `${toDelay(v)} ms`,
          },
        ]}
        params={{ delay }}
        onValues={(v) => {
          const d = toDelay(v.s);
          setDelay(d);
          blinkStore.set(d);
        }}
        caption="The orange LED marked L is wired to pin 13. Change the delay and watch the board, then glance at the top-left corner of this page."
      >
        {() => (
          <pre className="code" aria-label="Blink sketch">
            <span className="k">void</span> loop() {'{\n'}
            {'  '}digitalWrite(<span className="k">13</span>, HIGH);{'   '}
            <span className="c">// LED on</span>
            {'\n  '}delay(<span className="n">{delay}</span>);{'\n'}
            {'  '}digitalWrite(<span className="k">13</span>, LOW);{'    '}
            <span className="c">// LED off</span>
            {'\n  '}delay(<span className="n">{delay}</span>);{'\n'}
            {'}'}
          </pre>
        )}
      </Figure>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 08 · Mega                                                           */
/* ------------------------------------------------------------------ */

const BOARD_FACTS: [string, string, string, string][] = [
  ['Uno', '20', '32 KB', '5 V'],
  ['Mega 2560', '70', '256 KB', '5 V'],
  ['Due', '66', '512 KB', '3.3 V'],
];

export function Mega() {
  return (
    <Chapter id="mega" n="08" years="2009 → 2011" year={2011} title="More of everything">
      <Scope>
        <Prose>
          <p>
            Twenty pins and 32 KB go a long way, until you try to build a 3D printer. The answer was a longer board
            around a much bigger chip.
          </p>
          <Note>
            The Mega took Arduino to a new level, quadrupling on-chip memory to 128KB and more than tripling the total
            number of I/O and input pins in a significantly larger form factor.
          </Note>
          <Note>
            With the Mega2560, memory doubled again to 256KB. Though larger, the new form factor remains
            pin-compatible with the standard Arduino shield footprint.
          </Note>
          <p>
            That second sentence is the clever part. A <em>shield</em> is an add-on board that plugs into the socket
            strips from above. By 2010 there were a great many, and every one assumed the Uno’s pin positions, odd gap and
            all. So the Mega keeps the Uno’s four socket strips exactly where they were, and puts everything new to
            the right of them.
          </p>
        </Prose>
        <Figure
          setup={setupShield}
          label="A prototyping shield above an Arduino board"
          view={{ yaw: -0.5, pitch: 0.72, radius: 54 }}
          aspect={0.62}
          controls={[
            { key: 'board', label: 'Board underneath', initial: 0, options: BOARD_FACTS.map((b) => b[0]) },
            { key: 'seat', label: 'Plug in', initial: 0, color: 'var(--teal)', format: pct },
          ]}
        >
          {(v) => (
            <>
              <Readout
                items={[
                  ['Board', BOARD_FACTS[v.board][0]],
                  ['I/O pins', BOARD_FACTS[v.board][1]],
                  ['Flash', BOARD_FACTS[v.board][2]],
                  ['Logic', BOARD_FACTS[v.board][3]],
                ]}
              />
              {v.board === 2 && (
                <p className="warn" role="status">
                  <b>It fits, but check before you plug it in.</b> The Due runs at 3.3 V. A shield that pushes 5 V
                  back into its pins can damage the processor.
                </p>
              )}
            </>
          )}
        </Figure>
        <Prose>
          <p>
            Swap the board under the shield. The red board never has to know. On the Mega, the{' '}
            <Term part="mcu">processor</Term> is a hundred-pin square set on the diagonal, and a{' '}
            <Term part="headers">double row of sockets</Term> across the far end carries most of the extra pins.
          </p>
          <Note label="Mega ADK">Mega update for use with Android Accessory Development Kit (ADK).</Note>
          <p>The ADK adds a USB host port, so the Arduino can be the thing a phone plugs into.</p>
        </Prose>
      </Scope>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 09 · ATmega32U4                                                     */
/* ------------------------------------------------------------------ */

export function Leonardo() {
  return (
    <Chapter id="leonardo" n="09" years="2012" year={2012} title="Two chips become one">
      <Scope>
        <Prose>
          <p>
            Remember the Uno’s second computer, the one that only handles USB? In 2012 Atmel’s ATmega32U4 made it
            redundant.
          </p>
          <Note>Integrates USB controller into processor chip.</Note>
        </Prose>
        <Figure
          setup={setupSwap}
          label="Arduino Uno turning into an Arduino Leonardo"
          view={{ yaw: 0.15, pitch: 1.0, box: [42, 36] }}
          aspect={0.6}
          controls={[
            {
              key: 'swap',
              label: 'Uno → Leonardo',
              initial: 0,
              color: 'var(--teal)',
              format: (v) => (v < 0.5 ? 'Uno' : 'Leonardo'),
            },
          ]}
          caption="Same outline, same sockets. The socketed DIP, the USB chip and the big square jack all leave; one flat chip and a micro-USB socket take their place."
        />
        <Prose>
          <p>
            On the <strong>Leonardo</strong> a single <Term part="mcu">ATmega32U4</Term> runs your program and speaks
            USB itself, through a <Term part="usb">micro-USB socket</Term>. Fewer parts, a cheaper board, and one new
            ability.
          </p>
          <Note>Emulates mouse and keyboard over USB.</Note>
          <p>
            Since the chip running your code is the USB device, your code decides what kind of device it is. A
            Leonardo can type. It can move the pointer. To the computer it is simply a keyboard that happens to have
            twenty spare pins.
          </p>
          <p>
            The same chip went into the stick-of-gum <strong>Micro</strong> and the <strong>LilyPad USB</strong>, and
            in 2013 it got a roommate.
          </p>
          <Note label="Yún">
            First dual-core model, combining ATmega32u4 with MIPS embedded Linux machine.
          </Note>
          <p>
            Strictly, the Yún is two computers sharing a board: the familiar microcontroller for pins and timing, and
            a small Linux system with Wi-Fi and Ethernet for everything a microcontroller is bad at.
          </p>
        </Prose>
      </Scope>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ */
/* 10 · Due                                                            */
/* ------------------------------------------------------------------ */

const CHIPS: [string, number, string, string, string, string][] = [
  ['ATmega8', 8, '2005', 'Serial, USB, NG', '8-bit', '16 MHz'],
  ['ATmega168', 16, '2007', 'NG+, Diecimila', '8-bit', '16 MHz'],
  ['ATmega328', 32, '2009', 'Duemilanove, Uno', '8-bit', '16 MHz'],
  ['ATmega1280', 128, '2009', 'Mega', '8-bit', '16 MHz'],
  ['ATmega2560', 256, '2010', 'Mega 2560, ADK', '8-bit', '16 MHz'],
  ['ATSAM3X8E', 512, '2012', 'Due', '32-bit', '84 MHz'],
];

export function Due() {
  return (
    <Chapter id="due" n="10" years="2012" year={2012} title="Leaving home">
      <Prose>
        <p>
          For seven years every Arduino had been built around the same family of 8-bit Atmel chips. The{' '}
          <strong>Due</strong> has the Mega’s outline and nothing of its insides.
        </p>
        <Note>
          The Due marks Arduino’s first departure from the AVR architecture. The ATSAM3X8E is an ARM Cortex M3
          processor with twice the memory and four times the clock speed of the ATmega2560.
        </Note>
        <Note>First Arduino to mount 32-bit processor. Runs at 3.3V rather than 5V.</Note>
        <p>
          The lower voltage is the price of admission. Fast modern silicon doesn’t run at 5 V, which is why the shield
          figure above came with a warning. What you get in return is easiest to see as a pile. Below, every cube is
          one kilobyte of program memory. Start at the left and step through the chips.
        </p>
      </Prose>
      <Figure
        setup={setupMemory}
        label="Program memory of each Arduino processor, one cube per kilobyte"
        view={{ yaw: -0.62, pitch: 0.5, radius: 8.6 }}
        aspect={0.62}
        controls={[
          {
            key: 'chip',
            label: 'Processor',
            initial: 0,
            min: 0,
            max: CHIPS.length - 1,
            step: 1,
            color: 'var(--ink)',
            format: (v) => CHIPS[Math.round(v)][0],
          },
        ]}
        caption="Each colour is the memory that chip added over the one before. The wire frame is the Due: 512 cubes, eight to a side. The first Arduino’s entire program space is the single teal row at the front."
      >
        {(v) => {
          const c = CHIPS[Math.round(v.chip)];
          return (
            <Readout
              items={[
                [
                  'Flash',
                  <>
                    <span className="swatch" style={{ background: TIER_COLORS[v.chip] }} />
                    {c[1]} KB
                  </>,
                ],
                ['Since', c[2]],
                ['Word', c[4]],
                ['Clock', c[5]],
              ]}
            />
          );
        }}
      </Figure>
      <Prose>
        <p>
          Sixty-four times the memory of the board from Ivrea, on a processor that moves four bytes at a time instead
          of one. And yet the Due still has the reset button in the corner, the barrel jack on the left, and that
          0.16-inch gap in the top row.
        </p>
      </Prose>
    </Chapter>
  );
}
