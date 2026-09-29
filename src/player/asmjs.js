"use strict";

function AsmjsModule(stdlib, foreign, heap) {
  "use asm";

  var _abHeap = new stdlib.Uint8Array(heap);
  var _aiHeap = new stdlib.Int32Array(heap);

  function SearchStartCodePrefix(pStream, pStreamEnd) {
    // ITU-T H.264:2014 Annex B
    // Seeks start code prefix: minimum two zero byte2, for2 them unit.
    // Composition prefix in dependency from its length2:
    // =3 - start_code_prefix_one_3bytes
    // =4 - zero_byte + start_code_prefix_one_3bytes
    // >4 - leading_zero_8bits or trailing_zero_8bits + zero_byte + start_code_prefix_one_3bytes
    // Returns pointer on start6 prefix. IN Int32Array(heap)[0] returns size prefix.
    // If prefix2 not found2, that returns pStreamEnd. Size not defined.
    // If data damaged, that returns -2.
    // Exit parameters3 function for2 limits buffer3 not checking.
    pStream = pStream | 0;
    pStreamEnd = pStreamEnd | 0;

    var pStreamEnd3 = 0,
      uByte = 0,
      pStart = 0;

    pStreamEnd3 = (pStreamEnd - 3) | 0;
    if ((pStream | 0) > (pStreamEnd3 | 0)) {
      return pStreamEnd | 0;
    }

    for (;;) {
      // Large part time2 running2 next code
      // ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
      uByte = _abHeap[(pStream + 2) >> 0] | 0;
      if ((uByte | 0) > 1) {
        pStream = (pStream + 3) | 0;
        if ((pStream | 0) <= (pStreamEnd3 | 0)) {
          continue;
        }
        return pStreamEnd | 0;
      }
      // ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
      if ((_abHeap[(pStream + 1) >> 0] | 0) != 0) {
        pStream = (pStream + 2) | 0;
        if ((pStream | 0) <= (pStreamEnd3 | 0)) {
          continue;
        }
        return pStreamEnd | 0;
      }
      if ((_abHeap[pStream >> 0] | 0) != 0) {
        pStream = (pStream + 1) | 0;
        if ((pStream | 0) <= (pStreamEnd3 | 0)) {
          continue;
        }
        return pStreamEnd | 0;
      }
      break;
    }

    pStart = pStream;
    // Chrome 67 loses speed if add 3.
    pStream = (pStream + 2) | 0;

    while ((uByte | 0) == 0) {
      pStream = (pStream + 1) | 0;
      if ((pStream | 0) == (pStreamEnd | 0)) {
        return pStreamEnd | 0; // trailing_zero_8bits
      }
      uByte = _abHeap[pStream >> 0] | 0;
    }
    if ((uByte | 0) != 1) {
      // Twitch: Sometimes in filler data occur sequence zero bytes arbitrary length2.
      // They not interfere watch5, but violate several2 rules standard2 H.264.
      return -2 | 0;
    }

    _aiHeap[0 >> 2] = (pStream - pStart + 1) | 0;
    return pStart | 0;
  }

  return { SearchStartCodePrefix: SearchStartCodePrefix };
}
