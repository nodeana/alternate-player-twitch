"use strict";

// Runs in the page MAIN world (see manifest content_scripts.world).
// Hooks fetch so GQL integrity tokens can be persisted for the player.

(function captureFunction2() {
  const originalFunction = window.fetch;
  window.fetch = function (address, parameters) {
    const promise = originalFunction(address, parameters);
    if (
      address === "https://gql.twitch.tv/integrity" &&
      parameters &&
      parameters.method &&
      parameters.method.toUpperCase() === "POST" &&
      parameters.headers &&
      parameters.headers.Authorization
    ) {
      promise
        .then((response) => {
          if (response.ok && response.status === 200) {
            return response
              .clone()
              .json()
              .then(({ token: sToken, expiration: nExpiresAfter }) => {
                if (
                  typeof sToken == "string" &&
                  sToken &&
                  Number.isSafeInteger(nExpiresAfter)
                ) {
                  const currentTime = Date.now();
                  nExpiresAfter = Math.min(
                    Math.max(
                      nExpiresAfter - 3 * 60 * 1e3,
                      currentTime + 1 * 60 * 60 * 1e3,
                    ),
                    currentTime + 24 * 60 * 60 * 1e3,
                  );
                  document.cookie = `tw5~gqltoken=${encodeURIComponent(
                    JSON.stringify({
                      sToken,
                      nExpiresAfter,
                    }),
                  )}; path=/tw5~storage/; samesite=none; secure; max-age=86400`;
                }
              });
          }
        })
        .catch((reason) => {});
    }
    return promise;
  };
})();
