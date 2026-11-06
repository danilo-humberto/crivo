const reviewToast=document.querySelector('#review-toast');
if(reviewToast){
  const native=typeof reviewToast.showPopover==='function';
  const close=()=>{
    if(native&&reviewToast.matches(':popover-open'))reviewToast.hidePopover();
    reviewToast.hidden=true;
  };
  if(!native)reviewToast.removeAttribute('popover');
  reviewToast.hidden=false;
  if(native)reviewToast.showPopover();
  reviewToast.querySelector('[role="status"]').textContent=reviewToast.dataset.message;
  reviewToast.querySelector('button').addEventListener('click',close);
  setTimeout(()=>{if(!reviewToast.matches(':focus-within'))close();},6000);
  // Reloading or sharing this URL must not replay the success notification.
  const url=new URL(window.location.href);
  url.searchParams.delete('enviada');
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
}
