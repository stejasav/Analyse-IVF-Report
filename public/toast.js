window.toast = {
  success(message) {
    iziToast.success({
      title: "Success",
      message,
      position: "topRight",
      timeout: 3000,
    });
  },

  error(message) {
    iziToast.error({
      title: "Error",
      message,
      position: "topRight",
      timeout: 4000,
    });
  },

  warning(message) {
    iziToast.warning({
      title: "Warning",
      message,
      position: "topRight",
      timeout: 3000,
    });
  },

  info(message) {
    iziToast.info({
      title: "Info",
      message,
      position: "topRight",
    });
  },
};
