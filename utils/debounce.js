export default function debounce(callback, wait, context = this) {
  let timeout = null;
  let callbackArgs = null;

  const later = () => {
    callback.apply(context, callbackArgs);
    timeout = null;
  };

  return function () {
    if (timeout) {
      clearTimeout(timeout);
    }
    callbackArgs = arguments;
    timeout = setTimeout(later, wait);
  }
}