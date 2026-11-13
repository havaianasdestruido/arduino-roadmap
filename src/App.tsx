import { TopBar } from './components/layout';
import { Chip, Etch, Hero, Lineage, Origins, Small } from './sections/PartOne';
import { Due, Leonardo, Lily, Mega, Milestones, Uno } from './sections/PartTwo';
import { Tree } from './sections/Tree';

export default function App() {
  return (
    <>
      <TopBar />
      <main>
        <Hero />
        <Origins />
        <Etch />
        <Lineage />
        <Chip />
        <Small />
        <Lily />
        <Milestones />
        <Uno />
        <Mega />
        <Leonardo />
        <Due />
        <Tree />
      </main>
      <footer className="foot">
        <div className="foot-in">
          <p className="tag">
            <b>Special</b>
            <span>Board Field Guide</span>
          </p>
          <p>
            Adapted from “Evolution of Arduino”, a two-page chart in the <i>Make:</i> Special Board Field Guide. Text
            set in blue with a rule beside it is quoted from that chart.
          </p>
          <p>
            The 3D models are built from code, not scanned. Board outlines, connector positions, pin spacing and chip
            packages follow the real hardware; the placement of small parts and the copper routing are illustrative.
          </p>
        </div>
      </footer>
    </>
  );
}
