export const adminStats = [
  ['Total users','24,892','+12.4%'],['Active viewers','18,420','+8.1%'],['Creator channels','3,284','+142'],['Business channels','986','+38'],
  ['Active campaigns','214','+19'],['Active contracts','168','+11'],['Completed contracts','1,842','+86'],['Pending verifications','47','Needs review'],
  ['Open disputes','12','3 urgent'],['Pending reports','31','8 high priority'],['Transaction volume','₮2.84B','+18.7%'],['Commission revenue','₮284M','+16.2%'],
]

export const adminUsers = [
  { id:'usr-10482', name:'Amara Bat', email:'amara@vyra.mn', type:'Viewer + Creator', channels:1, status:'Active', joined:'Jul 02, 2026', active:'2 min ago', avatar:'AB' },
  { id:'usr-10471', name:'Sarnai Erdene', email:'sarnai@gobi.mn', type:'Viewer + Business', channels:2, status:'Active', joined:'Jun 28, 2026', active:'18 min ago', avatar:'SE' },
  { id:'usr-10456', name:'Temuulen Film', email:'hello@temuulen.film', type:'Creator', channels:1, status:'Active', joined:'Jun 21, 2026', active:'1 hour ago', avatar:'TF' },
  { id:'usr-10422', name:'Mika Play', email:'mika@play.gg', type:'Creator', channels:1, status:'Restricted', joined:'Jun 09, 2026', active:'Yesterday', avatar:'MP' },
  { id:'usr-10398', name:'Northstar Studio', email:'team@northstar.mn', type:'Business', channels:1, status:'Suspended', joined:'May 22, 2026', active:'Jul 18', avatar:'NS' },
  { id:'usr-10341', name:'Nara Eats', email:'nara@eats.co', type:'Viewer + Creator', channels:1, status:'Active', joined:'Apr 14, 2026', active:'3 hours ago', avatar:'NE' },
]

export const adminChannels = [
  { id:'chn-2041', name:'Amara Bat', owner:'Amara Bat', type:'Creator', category:'Fashion', verified:'Verified', status:'Active', featured:true, followers:'204K', reports:0 },
  { id:'chn-2034', name:'GOBI Cashmere', owner:'Sarnai Erdene', type:'Business', category:'Fashion & Apparel', verified:'Verified', status:'Active', featured:true, followers:'88K', reports:1 },
  { id:'chn-2018', name:'Temuulen Film', owner:'Temuulen B.', type:'Creator', category:'Travel', verified:'Verified', status:'Active', featured:false, followers:'112K', reports:0 },
  { id:'chn-1997', name:'Northstar Studio', owner:'Northstar LLC', type:'Business', category:'Agency', verified:'Unverified', status:'Suspended', featured:false, followers:'12K', reports:4 },
  { id:'chn-1982', name:'Mika Play', owner:'Mika D.', type:'Creator', category:'Gaming', verified:'Reviewing', status:'Restricted', featured:false, followers:'342K', reports:2 },
]

export const adminCampaigns = [
  { id:'cmp-8421', business:'GOBI Cashmere', title:'Soft Icons AW26', status:'Open', budget:'₮18.5M', applications:42, creators:3, created:'Jul 12', deadline:'Sep 02', reports:0 },
  { id:'cmp-8404', business:'Aero Mongolia', title:'City in Motion', status:'In progress', budget:'₮10.2M', applications:28, creators:2, created:'Jul 08', deadline:'Aug 18', reports:1 },
  { id:'cmp-8388', business:'Lhamour', title:'Skin, Honestly', status:'Draft', budget:'₮6.4M', applications:0, creators:0, created:'Jul 01', deadline:'Aug 28', reports:0 },
  { id:'cmp-8362', business:'Shoppy', title:'Checkout Culture', status:'Paused', budget:'₮8.8M', applications:35, creators:4, created:'Jun 24', deadline:'Sep 12', reports:3 },
]

export const adminContracts = [
  { id:'CTR-8821', creator:'Amara Bat', business:'GOBI Cashmere', campaign:'Soft Icons AW26', amount:'₮19.2M', status:'Payment required', deadline:'Sep 05', payment:'Pending', dispute:'None' },
  { id:'CTR-8794', creator:'Temuulen Film', business:'Aero Mongolia', campaign:'City in Motion', amount:'₮11.5M', status:'In progress', deadline:'Aug 20', payment:'Escrow funded', dispute:'None' },
  { id:'CTR-8756', creator:'Mika Play', business:'Playtime Festival', campaign:'Sound of Summer', amount:'₮4.8M', status:'Disputed', deadline:'Aug 01', payment:'Frozen', dispute:'Open' },
  { id:'CTR-8712', creator:'Nara Eats', business:'Lhamour', campaign:'Skin, Honestly', amount:'₮6.4M', status:'Completed', deadline:'Jul 19', payment:'Released', dispute:'Resolved' },
]

export const adminPayments = [
  { id:'TX-8042', user:'GOBI Cashmere', contract:'CTR-8821', amount:'₮9.6M', commission:'₮960K', method:'Corporate card', status:'Escrow', date:'Jul 23' },
  { id:'TX-8038', user:'Aero Mongolia', contract:'CTR-8794', amount:'₮5.75M', commission:'₮575K', method:'Bank transfer', status:'Paid', date:'Jul 22' },
  { id:'TX-8019', user:'Playtime Festival', contract:'CTR-8756', amount:'₮2.4M', commission:'₮240K', method:'Card', status:'Failed', date:'Jul 20' },
  { id:'TX-7988', user:'Lhamour', contract:'CTR-8712', amount:'₮6.4M', commission:'₮640K', method:'Bank transfer', status:'Refunded', date:'Jul 18' },
]

export const adminDisputes = [
  { id:'dsp-302', contract:'CTR-8756', creator:'Mika Play', business:'Playtime Festival', reason:'Deliverable scope disagreement', status:'Under Review', priority:'Urgent', opened:'Jul 21' },
  { id:'dsp-298', contract:'CTR-8681', creator:'Solongo Moves', business:'Move Lab', reason:'Milestone approval delay', status:'Waiting for Business', priority:'High', opened:'Jul 18' },
  { id:'dsp-287', contract:'CTR-8594', creator:'Enkh Tech', business:'Shoppy', reason:'Usage rights concern', status:'Waiting for Creator', priority:'Normal', opened:'Jul 12' },
]

export const adminReports = [
  { id:'rpt-941', target:'Northstar Studio', targetType:'Channel', reason:'Misleading business identity', reporter:'user_8421', priority:'High', status:'Pending', created:'Jul 23' },
  { id:'rpt-938', target:'Checkout Culture', targetType:'Campaign', reason:'Unclear compensation terms', reporter:'Amara Bat', priority:'Normal', status:'Reviewing', created:'Jul 22' },
  { id:'rpt-927', target:'Content #SC-188', targetType:'Content', reason:'Unauthorized media use', reporter:'GOBI Cashmere', priority:'Urgent', status:'Escalated', created:'Jul 20' },
]

export const moderationItems = [
  { id:'mod-221', caption:'Summer city diary · paid partnership', creator:'Amara Bat', business:'GOBI Cashmere', campaign:'Soft Icons', reports:2, status:'Awaiting review', image:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=85' },
  { id:'mod-218', caption:'Festival field notes, day two', creator:'Mika Play', business:'Playtime', campaign:'Sound of Summer', reports:4, status:'Flagged', image:'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=85' },
  { id:'mod-209', caption:'The open road — final film', creator:'Temuulen Film', business:'Aero Mongolia', campaign:'City in Motion', reports:0, status:'Approved', image:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85' },
]

export const verifications = [
  { id:'ver-601', name:'Mika Play', type:'Creator verification', submitted:'Jul 23', risk:'Low', history:'First request', status:'Pending' },
  { id:'ver-598', name:'Northstar Studio', type:'Business verification', submitted:'Jul 22', risk:'Medium', history:'Resubmission', status:'Reviewing' },
  { id:'ver-587', name:'Aero Mongolia', type:'Payer verification', submitted:'Jul 19', risk:'Low', history:'Annual renewal', status:'Pending' },
  { id:'ver-579', name:'Nara Eats', type:'Social account verification', submitted:'Jul 17', risk:'Low', history:'Instagram added', status:'Approved' },
]

export const auditLogs = [
  { id:'log-19022', actor:'Admin · Bolor', action:'Suspended channel', target:'Northstar Studio', category:'Moderation', time:'Jul 23, 14:42', ip:'103.212.118.42', status:'Success' },
  { id:'log-19018', actor:'Admin · Anu', action:'Approved verification', target:'Aero Mongolia', category:'User management', time:'Jul 23, 13:18', ip:'202.131.224.18', status:'Success' },
  { id:'log-19011', actor:'System', action:'Escrow status updated', target:'CTR-8794', category:'Payment', time:'Jul 23, 11:06', ip:'internal', status:'Success' },
  { id:'log-18998', actor:'Admin · Bolor', action:'Changed campaign state', target:'CMP-8362', category:'Campaign', time:'Jul 22, 18:31', ip:'103.212.118.42', status:'Success' },
]

export const recentAdminActivity = [
  ['New registration','Amara Bat created an account','2 min ago'],['Channel creation','Nara Eats published a Creator Channel','18 min ago'],['Campaign published','GOBI launched Soft Icons AW26','42 min ago'],['Contract completed','CTR-8712 completed successfully','1 hour ago'],['Payment received','₮5.75M funded into escrow','2 hours ago'],['Dispute opened','Mika Play opened DSP-302','3 hours ago'],['User suspended','Northstar Studio was suspended','Yesterday'],
]
