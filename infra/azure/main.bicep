@description('Tiền tố dùng chung để tạo tên tài nguyên.')
@minLength(3)
param projectPrefix string = 'qlvmb-prod'

@description('Khu vực triển khai Azure.')
param location string = resourceGroup().location

@description('Tên đăng nhập quản trị của máy ảo Linux.')
param adminUsername string

@secure()
@description('Khóa SSH công khai cho máy ảo Azure.')
param adminSshPublicKey string

@description('Kích thước máy ảo chạy Coolify.')
param vmSize string = 'Standard_B2s'

@description('SKU máy chủ PostgreSQL Flexible Server.')
param postgresqlSku string = 'Standard_B1ms'

@description('Phân tầng hiệu năng cho PostgreSQL Flexible Server.')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param postgresqlTier string = 'Burstable'

@description('Phiên bản PostgreSQL.')
@allowed([
  '15'
  '16'
])
param postgresqlVersion string = '16'

@description('Tên đăng nhập quản trị PostgreSQL.')
@minLength(3)
param postgresqlAdminUsername string

@secure()
@description('Mật khẩu quản trị PostgreSQL.')
@minLength(12)
param postgresqlAdminPassword string

@description('Tên cơ sở dữ liệu ứng dụng.')
param databaseName string = 'airticket'

@description('CIDR mạng nội bộ cho máy ảo ứng dụng.')
param virtualNetworkAddressPrefix string = '10.30.0.0/16'

@description('CIDR subnet chạy Coolify.')
param applicationSubnetPrefix string = '10.30.1.0/24'

var publicIpName = '${projectPrefix}-pip'
var networkSecurityGroupName = '${projectPrefix}-nsg'
var virtualNetworkName = '${projectPrefix}-vnet'
var networkInterfaceName = '${projectPrefix}-nic'
var vmName = '${projectPrefix}-vm'
var postgresqlServerName = take(replace('${projectPrefix}-pgsql', '_', '-'), 63)
var postgresqlFirewallRuleName = 'allow-coolify-vm'
var sshPublicKeyPath = '/home/${adminUsername}/.ssh/authorized_keys'

resource publicIp 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: publicIpName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    publicIPAddressVersion: 'IPv4'
    dnsSettings: {
      domainNameLabel: toLower('${projectPrefix}-${uniqueString(resourceGroup().id)}')
    }
  }
}

resource networkSecurityGroup 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: networkSecurityGroupName
  location: location
  properties: {
    securityRules: [
      {
        name: 'allow-ssh'
        properties: {
          access: 'Allow'
          direction: 'Inbound'
          priority: 100
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
        }
      }
      {
        name: 'allow-http'
        properties: {
          access: 'Allow'
          direction: 'Inbound'
          priority: 110
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
        }
      }
      {
        name: 'allow-https'
        properties: {
          access: 'Allow'
          direction: 'Inbound'
          priority: 120
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        name: 'allow-coolify-bootstrap'
        properties: {
          access: 'Allow'
          direction: 'Inbound'
          priority: 130
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '8000'
        }
      }
    ]
  }
}

resource virtualNetwork 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: virtualNetworkName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        virtualNetworkAddressPrefix
      ]
    }
    subnets: [
      {
        name: 'application'
        properties: {
          addressPrefix: applicationSubnetPrefix
          networkSecurityGroup: {
            id: networkSecurityGroup.id
          }
        }
      }
    ]
  }
}

resource networkInterface 'Microsoft.Network/networkInterfaces@2024-05-01' = {
  name: networkInterfaceName
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primary'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: publicIp.id
          }
          subnet: {
            id: virtualNetwork.properties.subnets[0].id
          }
        }
      }
    ]
  }
}

resource linuxVm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: vmName
  location: location
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      customData: loadFileAsBase64('cloud-init-coolify.yml')
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              keyData: adminSshPublicKey
              path: sshPublicKeyPath
            }
          ]
        }
      }
    }
    storageProfile: {
      imageReference: {
        offer: '0001-com-ubuntu-server-jammy'
        publisher: 'Canonical'
        sku: '22_04-lts-gen2'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: networkInterface.id
          properties: {
            primary: true
          }
        }
      ]
    }
  }
}

resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  // Tên này luôn có hậu tố "-pgsql", chỉ tắt cảnh báo vì Bicep không suy luận được độ dài từ biểu thức.
  #disable-next-line BCP334
  name: postgresqlServerName
  location: location
  sku: {
    name: postgresqlSku
    tier: postgresqlTier
  }
  properties: {
    administratorLogin: postgresqlAdminUsername
    administratorLoginPassword: postgresqlAdminPassword
    availabilityZone: '1'
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    createMode: 'Create'
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    storage: {
      storageSizeGB: 32
    }
    version: postgresqlVersion
  }
}

resource postgresqlDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgresqlServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresqlFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgresqlServer
  name: postgresqlFirewallRuleName
  properties: {
    startIpAddress: publicIp.properties.ipAddress
    endIpAddress: publicIp.properties.ipAddress
  }
}

output coolifyBootstrapUrl string = 'http://${publicIp.properties.ipAddress}:8000'
output vmPublicIp string = publicIp.properties.ipAddress
output vmSshCommand string = 'ssh ${adminUsername}@${publicIp.properties.ipAddress}'
output postgresqlHost string = postgresqlServer.properties.fullyQualifiedDomainName
output postgresqlDatabaseName string = postgresqlDatabase.name
