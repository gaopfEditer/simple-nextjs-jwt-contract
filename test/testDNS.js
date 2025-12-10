const dns = require('dns').promises;
const https = require('https');
const http = require('http');

// 使用多种方法查询DNS服务器位置和域名归属区域
async function checkByDNS(domain) {
    console.log(`\n🔍 开始探测域名归属区�? ${domain}\n`);
    
    const results = {
        domain: domain,
        dnsServers: [],
        resolvedIPs: [],
        ipLocations: [],
        analysis: {}
    };
    
    try {
        // 方法1: 查询权威DNS服务�?
        console.log('📡 查询权威DNS服务�?..');
        results.dnsServers = await getAuthoritativeDNS(domain);
        console.log(`   找到 ${results.dnsServers.length} 个权威DNS服务器`);
        
        // 方法2: 解析域名IP地址
        console.log('\n🌐 解析域名IP地址...');
        results.resolvedIPs = await resolveDomainIPs(domain);
        console.log(`   解析�?${results.resolvedIPs.length} 个IP地址`);
        results.resolvedIPs.forEach(ip => {
            console.log(`   - ${ip}`);
        });
        
        // 方法3: 查询IP地理位置（多个数据源�?
        console.log('\n📍 查询IP地理位置...');
        for (const ip of results.resolvedIPs) {
            const location = await getIPLocationMultiSource(ip);
            if (location) {
                results.ipLocations.push(location);
                console.log(`   ${ip}: ${location.country || '未知'} (${location.countryCode || 'N/A'})`);
            }
        }
        
        // 方法4: 查询DNS解析�?
        console.log('\n🔗 追踪DNS解析�?..');
        const dnsChain = await traceDNSChain(domain);
        if (dnsChain) {
            results.dnsChain = dnsChain;
            console.log(`   解析链长�? ${dnsChain.length}`);
        }
        
        // 方法5: 查询域名注册信息（WHOIS�?
        console.log('\n📋 查询域名注册信息...');
        const whoisInfo = await getDomainWhois(domain);
        if (whoisInfo) {
            results.whois = whoisInfo;
            console.log(`   注册�? ${whoisInfo.registrar || '未知'}`);
            console.log(`   注册国家: ${whoisInfo.country || '未知'}`);
        }
        
        // 综合分析
        console.log('\n📊 综合分析...');
        results.analysis = analyzeDNSLocation(results);
        
    } catch (error) {
        console.error('�?查询过程出错:', error.message);
        results.error = error.message;
    }
    
    return results;
}

// 获取权威DNS服务�?
async function getAuthoritativeDNS(domain) {
    const servers = [];
    
    try {
        // 提取根域�?
        const rootDomain = extractRootDomain(domain);
        
        // 查询NS记录
        const nsRecords = await dns.resolveNs(rootDomain).catch(() => []);
        
        for (const ns of nsRecords) {
            try {
                // 解析NS服务器IP
                const nsIPs = await dns.resolve4(ns).catch(() => []);
                const nsIPv6 = await dns.resolve6(ns).catch(() => []);
                
                // 查询NS服务器地理位�?
                let location = null;
                if (nsIPs.length > 0) {
                    location = await getIPLocationMultiSource(nsIPs[0]);
                }
                
                servers.push({
                    hostname: ns,
                    ipv4: nsIPs,
                    ipv6: nsIPv6,
                    location: location
                });
            } catch (e) {
                servers.push({
                    hostname: ns,
                    error: e.message
                });
            }
        }
    } catch (error) {
        console.error('   查询NS记录失败:', error.message);
    }
    
    return servers;
}

// 解析域名IP地址（支持IPv4和IPv6�?
async function resolveDomainIPs(domain) {
    const ips = [];
    
    try {
        // IPv4
        const ipv4 = await dns.resolve4(domain).catch(() => []);
        ips.push(...ipv4);
        
        // IPv6
        const ipv6 = await dns.resolve6(domain).catch(() => []);
        ips.push(...ipv6);
        
        // A记录
        const aRecords = await dns.resolve(domain, 'A').catch(() => []);
        aRecords.forEach(record => {
            if (record.address && !ips.includes(record.address)) {
                ips.push(record.address);
            }
        });
    } catch (error) {
        console.error('   DNS解析失败:', error.message);
    }
    
    return ips;
}

// 多数据源查询IP地理位置
async function getIPLocationMultiSource(ip) {
    const sources = [
        () => queryIPLocationIPSB(ip),
        () => queryIPLocationIPAPI(ip),
        () => queryIPLocationIPAPICom(ip)
    ];
    
    for (const queryFunc of sources) {
        try {
            const result = await Promise.race([
                queryFunc(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('超时')), 5000)
                )
            ]);
            
            if (result && result.countryCode) {
                return result;
            }
        } catch (error) {
            // 继续尝试下一个数据源
            continue;
        }
    }
    
    return null;
}

// 数据�?: ip.sb
async function queryIPLocationIPSB(ip) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.ip.sb/geoip/${ip}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({
                        ip: ip,
                        country: json.country,
                        countryCode: json.country_code,
                        region: json.region,
                        city: json.city,
                        isp: json.isp,
                        organization: json.organization,
                        asn: json.asn,
                        isDomestic: json.country_code === 'CN',
                        source: 'ip.sb'
                    });
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// 数据�?: ip-api.com
async function queryIPLocationIPAPI(ip) {
    return new Promise((resolve, reject) => {
        http.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'success') {
                        resolve({
                            ip: ip,
                            country: json.country,
                            countryCode: json.countryCode,
                            region: json.regionName,
                            city: json.city,
                            isp: json.isp,
                            organization: json.org,
                            asn: json.as,
                            lat: json.lat,
                            lon: json.lon,
                            isDomestic: json.countryCode === 'CN',
                            source: 'ip-api.com'
                        });
                    } else {
                        reject(new Error(json.message));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// 数据�?: ipapi.co
async function queryIPLocationIPAPICom(ip) {
    return new Promise((resolve, reject) => {
        https.get(`https://ipapi.co/${ip}/json/`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (!json.error) {
                        resolve({
                            ip: ip,
                            country: json.country_name,
                            countryCode: json.country_code,
                            region: json.region,
                            city: json.city,
                            isp: json.org,
                            organization: json.org,
                            asn: json.asn,
                            lat: json.latitude,
                            lon: json.longitude,
                            isDomestic: json.country_code === 'CN',
                            source: 'ipapi.co'
                        });
                    } else {
                        reject(new Error(json.reason));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// 追踪DNS解析�?
async function traceDNSChain(domain) {
    const chain = [];
    let currentDomain = domain;
    
    try {
        // 最多追�?0�?
        for (let i = 0; i < 10; i++) {
            try {
                const cname = await dns.resolveCname(currentDomain).catch(() => []);
                if (cname.length > 0) {
                    chain.push({
                        domain: currentDomain,
                        type: 'CNAME',
                        target: cname[0]
                    });
                    currentDomain = cname[0];
                } else {
                    break;
                }
            } catch (e) {
                break;
            }
        }
    } catch (error) {
        console.error('   DNS链追踪失�?', error.message);
    }
    
    return chain.length > 0 ? chain : null;
}

// 查询域名WHOIS信息（简化版，使用在线API�?
async function getDomainWhois(domain) {
    const rootDomain = extractRootDomain(domain);
    
    try {
        return new Promise((resolve, reject) => {
            https.get(`https://whoisjson.com/api/v1/whois?domain=${rootDomain}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.registrar) {
                            resolve({
                                domain: rootDomain,
                                registrar: json.registrar,
                                country: json.country,
                                creationDate: json.creation_date,
                                expirationDate: json.expiration_date,
                                nameServers: json.name_servers
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    } catch (error) {
        return null;
    }
}

// 提取根域�?
function extractRootDomain(domain) {
    const parts = domain.split('.');
    if (parts.length >= 2) {
        return parts.slice(-2).join('.');
    }
    return domain;
}

// 综合分析DNS位置信息
function analyzeDNSLocation(results) {
    const analysis = {
        isDomestic: false,
        confidence: 'low',
        country: null,
        countryCode: null,
        evidence: []
    };
    
    // 统计国家代码
    const countryCounts = {};
    const countryCodes = new Set();
    
    // 从IP地理位置统计
    results.ipLocations.forEach(loc => {
        if (loc.countryCode) {
            countryCodes.add(loc.countryCode);
            countryCounts[loc.countryCode] = (countryCounts[loc.countryCode] || 0) + 1;
            if (loc.isDomestic) {
                analysis.evidence.push(`IP ${loc.ip} 位于中国`);
            }
        }
    });
    
    // 从DNS服务器位置统�?
    results.dnsServers.forEach(server => {
        if (server.location && server.location.countryCode) {
            countryCodes.add(server.location.countryCode);
            countryCounts[server.location.countryCode] = (countryCounts[server.location.countryCode] || 0) + 1;
            if (server.location.isDomestic) {
                analysis.evidence.push(`DNS服务�?${server.hostname} 位于中国`);
            }
        }
    });
    
    // 从WHOIS信息统计
    if (results.whois && results.whois.country) {
        countryCodes.add(results.whois.country);
        analysis.evidence.push(`域名注册信息显示: ${results.whois.country}`);
    }
    
    // 判断主要归属国家
    if (countryCodes.size > 0) {
        const sortedCountries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1]);
        
        if (sortedCountries.length > 0) {
            analysis.countryCode = sortedCountries[0][0];
            analysis.isDomestic = sortedCountries[0][0] === 'CN';
            
            // 查找对应的国家名�?
            const mainLocation = results.ipLocations.find(loc => 
                loc.countryCode === analysis.countryCode
            );
            if (mainLocation) {
                analysis.country = mainLocation.country;
            }
        }
    }
    
    // 计算置信�?
    const totalEvidence = results.ipLocations.length + results.dnsServers.length;
    if (totalEvidence >= 3 && countryCodes.size === 1) {
        analysis.confidence = 'high';
    } else if (totalEvidence >= 2) {
        analysis.confidence = 'medium';
    }
    
    return analysis;
}

// 主函�?
async function main() {
    const args = process.argv.slice(2);
    const domain = args[0] || 'www.baidu.com';
    
    try {
        const result = await checkByDNS(domain);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 探测结果汇总');
        console.log('='.repeat(60));
        console.log(`\n域名: ${result.domain}`);
        
        if (result.dnsServers.length > 0) {
            console.log(`\n📡 权威DNS服务�?(${result.dnsServers.length}):`);
            result.dnsServers.forEach((server, index) => {
                console.log(`   ${index + 1}. ${server.hostname}`);
                if (server.ipv4.length > 0) {
                    console.log(`      IPv4: ${server.ipv4.join(', ')}`);
                }
                if (server.location) {
                    console.log(`      位置: ${server.location.country || '未知'} (${server.location.countryCode || 'N/A'})`);
                }
            });
        }
        
        if (result.resolvedIPs.length > 0) {
            console.log(`\n🌐 解析IP地址 (${result.resolvedIPs.length}):`);
            result.resolvedIPs.forEach((ip, index) => {
                const location = result.ipLocations.find(loc => loc.ip === ip);
                if (location) {
                    console.log(`   ${index + 1}. ${ip}`);
                    console.log(`      位置: ${location.country || '未知'} (${location.countryCode || 'N/A'})`);
                    console.log(`      ISP: ${location.isp || '未知'}`);
                    if (location.city) {
                        console.log(`      城市: ${location.city}`);
                    }
                } else {
                    console.log(`   ${index + 1}. ${ip} (位置未知)`);
                }
            });
        }
        
        if (result.dnsChain && result.dnsChain.length > 0) {
            console.log(`\n🔗 DNS解析�?`);
            result.dnsChain.forEach((link, index) => {
                console.log(`   ${index + 1}. ${link.domain} �?${link.target}`);
            });
        }
        
        if (result.whois) {
            console.log(`\n📋 域名注册信息:`);
            console.log(`   注册�? ${result.whois.registrar || '未知'}`);
            console.log(`   注册国家: ${result.whois.country || '未知'}`);
            if (result.whois.creationDate) {
                console.log(`   创建日期: ${result.whois.creationDate}`);
            }
        }
        
        console.log(`\n📊 综合分析:`);
        console.log(`   归属国家: ${result.analysis.country || '未知'} (${result.analysis.countryCode || 'N/A'})`);
        console.log(`   是否国内: ${result.analysis.isDomestic ? '是' : '否'}`);
        console.log(`   置信度: ${result.analysis.confidence === 'high' ? '高' : result.analysis.confidence === 'medium' ? '中' : '低'}`);
        
        if (result.analysis.evidence.length > 0) {
            console.log(`\n   证据:`);
            result.analysis.evidence.forEach((evidence, index) => {
                console.log(`   ${index + 1}. ${evidence}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        
    } catch (error) {
        console.error('�?探测失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚�?
if (require.main === module) {
    main();
}

// 导出函数供其他模块使�?
module.exports = {
    checkByDNS,
    getIPLocationMultiSource,
    resolveDomainIPs,
    getAuthoritativeDNS
};


