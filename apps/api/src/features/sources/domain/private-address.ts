import ipaddr from 'ipaddr.js';

/**
 * SSRF Guard — chỉ chấp nhận địa chỉ IP unicast định tuyến công khai.
 * Mọi dải đặc biệt (loopback, private, link-local, CGNAT, multicast, reserved)
 * đều bị từ chối. Địa chỉ IPv4-mapped (::ffff:10.0.0.1) được quy về IPv4 trước
 * khi xét dải, tránh lách guard bằng cách viết IP nội bộ dưới dạng IPv6.
 */
export function isPublicUnicastAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;

  let address = ipaddr.parse(ip);
  if (address.kind() === 'ipv6') {
    const v6 = address as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) address = v6.toIPv4Address();
  }

  return address.range() === 'unicast';
}
