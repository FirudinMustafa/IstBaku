import { ApplyClient } from './ApplyClient';

// Blog yazıcı başvuru sayfası. /publisher layout'u tüm /publisher/* rotalarını
// blog_publisher rolüne kapattığı için (başvuracaklar erişemiyordu + #310), başvuru
// sayfası bilinçli olarak /publisher dışında tutulur.
export default function BecomePublisherPage() {
  return <ApplyClient />;
}
