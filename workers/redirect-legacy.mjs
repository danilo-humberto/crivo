// Preserve the existing Durable Object class without changing its stored state.
export {ReviewLimiter} from './review-limiter.mjs';

export default {
  fetch(request) {
    const destination = new URL(request.url);
    destination.protocol = 'https:';
    destination.host = 'crivo.cifraengenharia.workers.dev';
    return new Response(null, {
      status: 308,
      headers: {Location: destination.href, 'Cache-Control': 'no-store'}
    });
  }
};
