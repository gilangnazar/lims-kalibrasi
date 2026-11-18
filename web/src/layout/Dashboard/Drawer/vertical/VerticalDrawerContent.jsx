// project-imports
import SimpleBarScroll from 'components/third-party/SimpleBar';
import Navigation from '../DrawerContent';

export default function VerticalDrawerContent({ selectedItems, setSelectedItems }) {
  return (
    <SimpleBarScroll style={{ height: 'calc(100vh - 74px)' }}>
      <Navigation selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
    </SimpleBarScroll>
  );
}
