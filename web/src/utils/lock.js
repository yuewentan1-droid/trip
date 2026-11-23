import JSEncrypt from 'jsencrypt';

// 密码不裸奔：跟服务器要当次的公钥，锁好再交给接口
export async function lock(text) {
  const { data } = await (await fetch('/api/auth/key')).json();
  const rsa = new JSEncrypt();
  rsa.setPublicKey(data.key);
  return rsa.encrypt(String(text));
}
