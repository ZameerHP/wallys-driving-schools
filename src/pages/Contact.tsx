import { ContactSection } from '../components/ContactSection';

export function Contact() {
  return (
    <div className="pt-20 bg-brand-offwhite min-h-[calc(100vh)] flex flex-col justify-center">
      <ContactSection isFullPage={true} showBreadcrumbs={true} />
    </div>
  );
}
