type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Trang bạn tìm không tồn tại hoặc đã được chuyển sang địa chỉ khác.</p>
    </section>
  );
}
