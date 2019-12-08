const core = require('@actions/core')
const exec = require('child_process').exec
const fs = require('fs')

const orgAlias = 'SFDX-ENV'
var threads = 0
var metadataObjects = []
var debug = true

function processDescribeMetadata(error, stdout, stderr){
	metadataObjects = JSON.parse(stdout).result.metadataObjects
	
	for(var metadata of metadataObjects){
		if(!metadata.inFolder){
			if(metadata.xmlName == 'StandardValueSet'){
				getStandardValueSets()
			}else{
				getMetadataDetails(metadata.xmlName)
			}
		}else{
			getMetadataDetails(metadata.xmlName.replace('Template','')+'Folder')
		}
		if(metadata.childXmlNames){
			for(var child of metadata.childXmlNames){
				metadataObjects.push({xmlName:child})
			}
		}
	}
}

function getMetadataDetails(xmlName, folder, parent){
	++threads
	console.log(('000' + threads).substr(-3) +' > '+(folder?folder+'/':'')+xmlName)
	exec('sfdx force:mdapi:listmetadata -m '+xmlName+(folder?' --folder '+folder:' ')+' -u '+orgAlias+' --json', {maxBuffer: 1024 * 1024 * 10}, function(error, stdout, stderr){
		--threads
		console.log(('000' + threads).substr(-3) +' < '+(folder?folder+'/':'')+xmlName)
		var metadataDetails = error?[]:JSON.parse(stdout).result
		for(var metadata of metadataObjects){
			if(metadata.xmlName.replace('Template','')+'Folder' == xmlName){
				metadata.content = (metadata.content || []).concat( [].concat(metadataDetails || []) )
				for(var folder of metadata.content) getMetadataDetails(metadata.xmlName, folder.fullName)
			}else if(metadata.xmlName == xmlName){
				metadata.content = (metadata.content || []).concat( [].concat(metadataDetails || []) )
			}
		}
		if(threads==0) finish()
	})
}

function getStandardValueSets(){
	var standardValueSets =  [
		{fullName:'AccountContactMultiRoles'},{fullName:'AccountContactRole'},{fullName:'AccountOwnership'},{fullName:'AccountRating'},{fullName:'AccountType'},{fullName:'AssetStatus'},{fullName:'CampaignMemberStatus'},{fullName:'CampaignStatus'},{fullName:'CampaignType'},{fullName:'CaseContactRole'},
		{fullName:'CaseOrigin'},{fullName:'CasePriority'},{fullName:'CaseReason'},{fullName:'CaseStatus'},{fullName:'CaseType'},{fullName:'ContactRole'},{fullName:'ContractContactRole'},{fullName:'ContractStatus'},{fullName:'EntitlementType'},{fullName:'EventSubject'},
		{fullName:'EventType'},{fullName:'FiscalYearPeriodName'},{fullName:'FiscalYearPeriodPrefix'},{fullName:'FiscalYearQuarterName'},{fullName:'FiscalYearQuarterPrefix'},{fullName:'IdeaCategory'},{fullName:'IdeaMultiCategory'},{fullName:'IdeaStatus'},{fullName:'IdeaThemeStatus'},{fullName:'Industry'},
		{fullName:'LeadSource'},{fullName:'LeadStatus'},{fullName:'OpportunityCompetitor'},{fullName:'OpportunityStage'},{fullName:'OpportunityType'},{fullName:'OrderStatus'},{fullName:'OrderType'},{fullName:'PartnerRole'},{fullName:'Product2Family'},{fullName:'QuestionOrigin'},
		{fullName:'QuickTextCategory'},{fullName:'QuickTextChannel'},{fullName:'QuoteStatus'},{fullName:'RoleInTerritory2'},{fullName:'SalesTeamRole'},{fullName:'Salutation'},{fullName:'ServiceContractApprovalStatus'},{fullName:'SocialPostClassification'},{fullName:'SocialPostEngagementLevel'},{fullName:'SocialPostReviewedStatus'},
		{fullName:'TaskPriority'},{fullName:'TaskStatus'},{fullName:'TaskSubject'},{fullName:'TaskType'},{fullName:'WorkOrderLineItemStatus'},{fullName:'WorkOrderPriority'},{fullName:'WorkOrderStatus'}
	]
	for(var metadata of metadataObjects) if(metadata.xmlName == 'StandardValueSet') metadata.content = standardValueSets
}

function finish(){
	metadataObjects.sort((a,b) => (a.xmlName > b.xmlName) ? 1 : ((b.xmlName > a.xmlName) ? -1 : 0))
	for(var metadata of metadataObjects){
		metadata.content.sort((a,b) => (a.fullName+a.id > b.fullName+b.id) ? 1 : ((b.fullName+b.id > a.fullName+a.id) ? -1 : 0))
	}
	fs.writeFile('./metadata.json', JSON.stringify(metadataObjects, null, 2), function (err, data){});
}

exec('sfdx force:mdapi:describemetadata -u '+orgAlias+' --json', {maxBuffer: 1024 * 1024 * 10}, processDescribeMetadata);
