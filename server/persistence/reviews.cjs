function normalizeCpf(value) {
  if(typeof value!=='string'||!/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value))throw Error('CPF inválido.');
  const cpf=value.replace(/[.-]/g,'');
  if(/^(\d)\1{10}$/.test(cpf))throw Error('CPF inválido.');
  for(let length=9;length<=10;length++) {
    let sum=0;
    for(let i=0;i<length;i++)sum+=Number(cpf[i])*(length+1-i);
    const digit=(sum*10)%11%10;
    if(digit!==Number(cpf[length]))throw Error('CPF inválido.');
  }
  return cpf;
}
function validateReview(review) {
  if(!review||typeof review.name!=='string'||!review.name.trim()||typeof review.comment!=='string'||!review.comment.trim()||!Number.isInteger(review.rating)||review.rating<1||review.rating>5)throw Error('Avaliação inválida.');
  return {name:review.name.trim(),comment:review.comment.trim(),rating:review.rating,cpf:normalizeCpf(review.cpf)};
}
module.exports={normalizeCpf,validateReview};
