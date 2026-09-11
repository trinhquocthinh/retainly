type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Màn hình này chưa được dựng.</p>
    </section>
  );
}
