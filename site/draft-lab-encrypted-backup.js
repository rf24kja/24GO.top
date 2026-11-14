/**
 * Optional encrypted EXPORT/IMPORT of the already manually saved Draft Lab
 * browser vault. Local AES-256-GCM and PBKDF2-SHA256 only. No server, cookies,
 * telemetry, password storage or automatic browser-vault encryption.
 *
 * A passphrase is NOT recoverable. An attacker with the file can guess weak
 * passwords offline; this is not a replacement for a password manager.
 */
export const ENCRYPTED_BACKUP_MAX_BYTES=600000;
export const ENCRYPTED_BACKUP_ITERATIONS=250000;
const FORMAT='24gotop-encrypted-draft-library';
const AAD='24gotop-encrypted-draft-library:v1:PBKDF2-SHA256:250000:AES-256-GCM';
const UTF8=new TextEncoder();
const BAD_SURROGATE=/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const BAD_CONTROL=/[\u0000-\u001f\u007f\u2028\u2029]/u;
const KEYS=['cipher','ciphertext','format','iterations','iv','kdf','salt','version'];

function reject(){throw new TypeError('encrypted_invalid');}
function passwordBytes(password){
 if(typeof password!=='string'||password.length<12||password.length>128||
    BAD_CONTROL.test(password)||BAD_SURROGATE.test(password))reject();
 const bytes=UTF8.encode(password);
 if(bytes.length>512)reject();
 return bytes;
}
function cryptoApi(api){
 if(!api||typeof api.getRandomValues!=='function'||
    typeof api.subtle?.importKey!=='function'||
    typeof api.subtle?.deriveKey!=='function'||
    typeof api.subtle?.encrypt!=='function'||
    typeof api.subtle?.decrypt!=='function')
  throw new Error('encrypted_unavailable');
 return api;
}
function base64url(bytes){
 const pieces=[];
 for(let i=0;i<bytes.length;i+=16384)
  pieces.push(String.fromCharCode(...bytes.subarray(i,i+16384)));
 return btoa(pieces.join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64url(encoded,maxBytes){
 if(typeof encoded!=='string'||!encoded.length||
    encoded.length>Math.ceil(maxBytes/3)*4+4||
    !/^[A-Za-z0-9_-]+$/.test(encoded)||encoded.length%4===1)reject();
 let decoded;
 try{decoded=atob(encoded.replace(/-/g,'+').replace(/_/g,'/')+
   '='.repeat((4-encoded.length%4)%4));}catch{reject();}
 if(decoded.length>maxBytes)reject();
 const data=Uint8Array.from(decoded,c=>c.charCodeAt(0));
 if(base64url(data)!==encoded)reject(); // strict canonical encodings
 return data;
}
async function keyFor(bytes,salt,api){
 const base=await api.subtle.importKey('raw',bytes,'PBKDF2',false,['deriveKey']);
 return api.subtle.deriveKey({
  name:'PBKDF2',salt,iterations:ENCRYPTED_BACKUP_ITERATIONS,hash:'SHA-256'
 },base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function envelopeFile(data){
 let value;
 try{value=JSON.parse(data);}catch{reject();}
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!==KEYS.join(',')||
    value.format!==FORMAT||value.version!==1||
    value.kdf!=='PBKDF2-SHA256'||value.iterations!==ENCRYPTED_BACKUP_ITERATIONS||
    value.cipher!=='AES-256-GCM')reject();
 const salt=fromBase64url(value.salt,16);
 const iv=fromBase64url(value.iv,12);
 const ciphertext=fromBase64url(value.ciphertext,ENCRYPTED_BACKUP_MAX_BYTES);
 if(salt.length!==16||iv.length!==12||ciphertext.length<17)reject();
 return {salt,iv,ciphertext};
}
export async function encryptDraftLibraryBackup(plaintext,passphrase,{cryptoImpl=globalThis.crypto}={}){
 const bytes=passwordBytes(passphrase),api=cryptoApi(cryptoImpl);
 if(typeof plaintext!=='string'||!plaintext.length||
    plaintext.length>ENCRYPTED_BACKUP_MAX_BYTES||
    BAD_SURROGATE.test(plaintext))reject();
 const data=UTF8.encode(plaintext);
 if(data.length>ENCRYPTED_BACKUP_MAX_BYTES-1024)reject();
 const salt=api.getRandomValues(new Uint8Array(16));
 const iv=api.getRandomValues(new Uint8Array(12));
 const key=await keyFor(bytes,salt,api);
 const encrypted=new Uint8Array(await api.subtle.encrypt({
  name:'AES-GCM',iv,additionalData:UTF8.encode(AAD),tagLength:128
 },key,data));
 return JSON.stringify({
  format:FORMAT,version:1,kdf:'PBKDF2-SHA256',
  iterations:ENCRYPTED_BACKUP_ITERATIONS,cipher:'AES-256-GCM',
  salt:base64url(salt),iv:base64url(iv),ciphertext:base64url(encrypted)
 },null,2)+'\n';
}
export async function decryptDraftLibraryBackup(text,passphrase,{cryptoImpl=globalThis.crypto}={}){
 const bytes=passwordBytes(passphrase),api=cryptoApi(cryptoImpl);
 if(typeof text!=='string'||text.length<100||
    text.length>ENCRYPTED_BACKUP_MAX_BYTES||BAD_SURROGATE.test(text))reject();
 const {salt,iv,ciphertext}=envelopeFile(text);
 try{
  const key=await keyFor(bytes,salt,api);
  const data=await api.subtle.decrypt({
   name:'AES-GCM',iv,additionalData:UTF8.encode(AAD),tagLength:128
  },key,ciphertext);
  return new TextDecoder('utf-8',{fatal:true}).decode(data);
 }catch{reject();}
}
