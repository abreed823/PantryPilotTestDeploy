import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../firebase/initFirebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  query,
  collection,
  getDocs,
  where,
  DocumentReference,
  DocumentData,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  onSnapshot,
  addDoc,
  CollectionReference,
} from "firebase/firestore";
import type { Family, Visit, Waste } from "../types";
import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./localStorage";

// Collection names
const familyCollection: string = "familyAccounts";
const familySubCollection: string = "families";
const visitsCollection: string = "visits";
const wasteCollection: string = "waste";
const startOfDay: number = new Date().setUTCHours(0, 0, 0, 0); //TODO: fix this time

export const useFirestore = () => {
  //PREPARE TO DELETE
  const saveFamily = async (family: Family) => {
    console.log("Trying to save family");
    const docId: string = family.phoneNumber; // Families are stored by their phone numbers
    const save = async () => {
      await setDoc(doc(db, familyCollection, docId), family); //add family document to db
    };

    save();
  };

  const newSaveFamily = async (family: Family) => {
    console.log("New Save Family");
    const docId: string = family.phoneNumber;
    const familyID: string = family.firstName + " " + family.lastName;
    const docRef: DocumentReference<DocumentData> = doc(
      db,
      familyCollection,
      docId,
      familySubCollection,
      familyID
    );

    const save = async () => {
      await setDoc(docRef, family);
    };

    save();
  };

  const appendFamily = async (family: Family) => {
    console.log("Appending family");
    const docId: string = family.phoneNumber; // Families are stored by their phone numbers
    const docRef: DocumentReference<DocumentData> = doc(
      db,
      familyCollection,
      docId
    );
    const colRef: CollectionReference<DocumentData> = collection(
      docRef,
      familySubCollection
    );
    const save = async () => {
      await addDoc(colRef, family); //add family document to db
    };

    save();
  };

  //PREPARE TO DELETE
  const getFamily = async (phoneNumber: string) => {
    let family: any = {};
    const docRef: DocumentReference<DocumentData> = doc(
      db,
      "families",
      phoneNumber
    );
    const docSnap: DocumentSnapshot<DocumentData> = await getDoc(docRef);

    if (docSnap.exists()) {
      // if no data exists, user should enter family data manually on UI.
      family = docSnap.data();
    }
    return family;
  };

  const queryFamilies = async (phoneNumber: string) => {
    const docId: string = phoneNumber;
    const docRef: DocumentReference<DocumentData> = doc(
      db,
      familyCollection,
      docId
    );
    const colRef: CollectionReference<DocumentData> = collection(
      docRef,
      familySubCollection
    );

    const q = query(colRef);
    let families: any = [];

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      families.push(doc.data());
    });

    return families;
  };

  const saveVisit = async (visit: Visit) => {
    const docId: string = visit.id.toString(); //visits are stored by their timestamp

    const save = async () => {
      await setDoc(doc(db, visitsCollection, docId), visit); //add visit to db
    };

    const docRef: DocumentReference<DocumentData> = doc(
      db,
      familyCollection,
      visit.phoneNumber,
      familySubCollection,
      visit.firstName + " " + visit.lastName
    );

    // update the family's array of visits each time they check in.
    const update = async () => {
      await updateDoc(docRef, {
        visits: arrayUnion(docId),
      });
    };

    save();
    update();
  };

  const saveWaste = async (waste: Waste) => {
    const docId: string = waste.timeOfWaste; // Waste is stored by its timestamp
    const save = async () => {
      await setDoc(doc(db, wasteCollection, docId), waste); //add waste to db
    };

    save();
  };

  // Configure this for my use case. Do I need a listener, or just a get?
  const getWaste = async (timestamp: string) => {
    // const q: Query<DocumentData> = query(
    //   collection(db, "waste"),
    //   where("timeOfWaste", ">=", 1678479399162) // this can be any timestamp
    // );
    // const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    // const dataArray: any = [];
    // querySnapshot.forEach((doc) => {
    //   // doc.data() is never undefined for query doc snapshots (comment is from Firebase docs)
    //   dataArray.push(doc.data());
    //   console.log(doc.data());
    // });
    // return dataArray;
  };

  return {
    saveFamily,
    newSaveFamily,
    appendFamily,
    getFamily,
    queryFamilies,
    saveVisit,
    saveWaste,
    getWaste,
  };
};

export const useVisitsListener = () => {
  const [currentVisits, setCurrentVisits] = useState<[]>([]);
  // const [visits, setVisits] = useLocalStorage('the key', [values]);
  const effectHasRun = useRef(false);

  // This listener should only be created on mount, not for every render
  useEffect(() => {
    if (!effectHasRun.current) {
      // Query visits
      const q: Query<DocumentData> = query(
        collection(db, "visits"),
        where("id", ">=", startOfDay) // This should either be the timestamp of when that day started, or when the user logged in
      );
      //
      // Listen to Query
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const visitDocs: any = [];
        querySnapshot.forEach((doc) => {
          visitDocs.push(doc.data());
        });

        setCurrentVisits(visitDocs);
      });

      return () => {
        effectHasRun.current = true;
      };
    }
  }, []);

  return currentVisits;
};
