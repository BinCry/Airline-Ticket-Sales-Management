param(
  [Parameter(Mandatory = $true)]
  [string]$SubscriptionId,

  [Parameter(Mandatory = $true)]
  [string]$ResourceGroupName,

  [Parameter(Mandatory = $true)]
  [string]$Location,

  [Parameter(Mandatory = $true)]
  [string]$ParametersFile
)

$ErrorActionPreference = "Stop"

az account set --subscription $SubscriptionId | Out-Null

az group create `
  --name $ResourceGroupName `
  --location $Location | Out-Null

az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file "infra/azure/main.bicep" `
  --parameters "@$ParametersFile"
