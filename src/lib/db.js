// supabase-js TIDAK melempar saat query ditolak (RLS, jaringan, constraint); hasilnya berupa { data, error }.
// `unwrap` mengubahnya menjadi exception agar blok try/catch pemanggil benar-benar menangkap kegagalan
// dan UI tidak menampilkan "berhasil" untuk data yang tidak tersimpan.
export const unwrap = (result) => {
  if (result?.error) throw result.error;
  return result?.data ?? null;
};

export default unwrap;
