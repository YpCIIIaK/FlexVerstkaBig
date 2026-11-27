(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (params.has("live") || !(local || params.has("mock"))) return;

  const wait = () => new Promise((r) => setTimeout(r, 700));
  const fail = (status, code) => { throw { status, code, detail: "" }; };

  const isNew = (channel, value) => !(channel === "email" ? /^user/i.test(value) : /01$/.test(value));
  const sendFails = (channel, value) => (channel === "email" ? /^fail/i.test(value) : /99$/.test(value));
  const taken = (channel, value) => (channel === "email" ? /^taken/i.test(value) : /11$/.test(value));

  window.flexAuthMock = {
    email: true,

    async sendCode({ channel, value, purpose }) {
      await wait();
      if (sendFails(channel, value)) fail(503, "SEND_FAILED");
      if (purpose === "contact" && taken(channel, value)) fail(409, "CONTACT_TAKEN");
    },

    async verifyCode({ channel, value, code, purpose }) {
      await wait();
      if (code === "000000") fail(400, "OTP_INVALID");
      if (code === "222222") fail(400, "OTP_EXPIRED");
      if (code === "500500") fail(500, "SERVER_ERROR");
      if (purpose === "contact") return { next: "iin" };
      return { next: isNew(channel, value) ? "contact" : "done" };
    },

    async register({ iin }) {
      await wait();
      if (iin === "000000000000") fail(400, "IIN_INVALID");
    },
  };
})();
