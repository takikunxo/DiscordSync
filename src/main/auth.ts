import * as os from 'os';
import axios from 'axios';
import iconv from 'iconv-lite';
import xmlQuery from 'xml-query';
// @ts-ignore
import XmlReader from 'xml-reader';

function getMacAddrArray(): string[] {
  const networkInterfaces = os.networkInterfaces();
  const macAddressArray: string[] = [];

  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const networkInterface = networkInterfaces[interfaceName];
    if (networkInterface) {
      networkInterface.forEach((info) => {
        if (!info.internal && info.mac) {
          if (macAddressArray.includes(info.mac)) {
            return;
          }
          macAddressArray.push(info.mac);
        }
      });
    }
  });

  return macAddressArray.sort((a, b) => b.localeCompare(a));
}

export default async function AuthValidate(isAvkey: string): Promise<boolean> {
  const macAddressArray = getMacAddrArray();
  const isPcid = macAddressArray[0].toUpperCase().replace(/:/g, '');
  const isComputerName = os.hostname();
  const url = `https://qlm2.net/automata/qlmlicenseserver/qlmservice.asmx/ValidateLicenseHttp?is_avkey=${isAvkey}&is_pcid=${isPcid}&is_computer_name=${isComputerName}\`;`;

  try {
    const response = await axios.get(url);
    const body = iconv.decode(Buffer.from(response.data), 'windows-31j');
    const ast = XmlReader.parseSync(body);
    const xq = xmlQuery(ast);
    const productID = xq.find('productID').text();
    const errors = xq.find('error');
    if (errors.length > 0) {
      throw new Error(errors.text());
    }
    if (productID !== '6') {
      throw new Error('Invalid productID');
    }
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
